import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { getSubscriber } from "./common/config/db";
import { verifySession } from "./modules/auth/auth.services";
import { toggleCheckbox, PUBSUB_CHANNEL, CheckboxUpdate } from "./modules/checkbox/checkbox.services";
import { checkWsRateLimit } from "./modules/checkbox/checkbox.ratelimit";

interface AuthedSocket extends WebSocket {
  userId?: string;
  socketId: string;
  isAlive: boolean;
}

interface WsMessage {
  type: "toggle" | "ping" | "auth";
  index?: number;
  token?: string;
}

const connectedClients = new Map<string, AuthedSocket>();

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  // Subscribe to Redis Pub/Sub for cross-instance updates
  setupRedisPubSub(wss);

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const socket = ws as AuthedSocket;
    socket.socketId = generateSocketId();
    socket.isAlive = true;
    connectedClients.set(socket.socketId, socket);

    console.log(`[WS] Client connected: ${socket.socketId} (total: ${connectedClients.size})`);

    // Send welcome
    safeSend(socket, {
      type: "connected",
      socketId: socket.socketId,
      connectedUsers: connectedClients.size,
    });

    socket.on("pong", () => { socket.isAlive = true; });

    socket.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString()) as WsMessage;
        await handleMessage(socket, msg);
      } catch {
        safeSend(socket, { type: "error", message: "Invalid message format" });
      }
    });

    socket.on("close", () => {
      connectedClients.delete(socket.socketId);
      console.log(`[WS] Client disconnected: ${socket.socketId} (total: ${connectedClients.size})`);
      broadcastAll(wss, {
        type: "stats",
        connectedUsers: connectedClients.size,
      });
    });

    socket.on("error", (err) => {
      console.error(`[WS] Socket error ${socket.socketId}:`, err.message);
    });
  });

  // Heartbeat - ping every 30s, close dead connections
  setInterval(() => {
    wss.clients.forEach((ws) => {
      const socket = ws as AuthedSocket;
      if (!socket.isAlive) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30_000);

  console.log("[WS] WebSocket server ready");
}

async function handleMessage(socket: AuthedSocket, msg: WsMessage): Promise<void> {
  switch (msg.type) {
    case "auth": {
      if (!msg.token) {
        safeSend(socket, { type: "auth_error", message: "No token" });
        return;
      }
      const user = await verifySession(msg.token);
      if (!user) {
        safeSend(socket, { type: "auth_error", message: "Invalid token" });
        return;
      }
      socket.userId = user.id;
      safeSend(socket, { type: "auth_ok", userId: user.id, name: user.name });
      break;
    }

    case "toggle": {
      if (!socket.userId) {
        safeSend(socket, { type: "error", message: "Authentication required to toggle" });
        return;
      }
      if (msg.index === undefined || msg.index < 0 || msg.index >= 1_000_000) {
        safeSend(socket, { type: "error", message: "Invalid index" });
        return;
      }

      // Rate limiting: 10 toggles per second per user
      const allowed = await checkWsRateLimit(socket.userId, 10, 1000);
      if (!allowed) {
        safeSend(socket, { type: "rate_limited", message: "Too fast! Max 10 toggles/sec." });
        return;
      }

      try {
        const update = await toggleCheckbox(msg.index, socket.userId);
        // Confirm back to sender
        safeSend(socket, { type: "toggle_ok", ...update });
      } catch (err) {
        safeSend(socket, { type: "error", message: (err as Error).message });
      }
      break;
    }

    case "ping": {
      safeSend(socket, { type: "pong", timestamp: Date.now() });
      break;
    }
  }
}

async function setupRedisPubSub(wss: WebSocketServer): Promise<void> {
  const subscriber = getSubscriber();

  await subscriber.subscribe(PUBSUB_CHANNEL, (message: string) => {
    try {
      const update = JSON.parse(message) as CheckboxUpdate;
      // Broadcast to all connected WS clients
      broadcastAll(wss, { type: "checkbox_update", ...update });
    } catch (err) {
      console.error("[PubSub] Parse error:", err);
    }
  });

  console.log(`[Redis PubSub] Subscribed to ${PUBSUB_CHANNEL}`);
}

function broadcastAll(wss: WebSocketServer, data: object): void {
  const json = JSON.stringify(data);
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(json);
    }
  });
}

function safeSend(socket: WebSocket, data: object): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

function generateSocketId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getConnectedCount(): number {
  return connectedClients.size;
}
