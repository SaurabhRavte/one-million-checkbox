import "dotenv/config";
import http from "http";
import app from "./app";
import { connectRedis } from "./common/config/db";
import { setupWebSocket } from "./websocket";

const PORT = parseInt(process.env.PORT || "4000", 10);

async function bootstrap(): Promise<void> {
  try {
    // Connect to Redis
    await connectRedis();

    // Create HTTP server from Express app
    const server = http.createServer(app);

    // Setup WebSocket on the same HTTP server
    setupWebSocket(server);

    server.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[Server] WebSocket on ws://localhost:${PORT}/ws`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || "development"}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("[Server] SIGTERM received, shutting down...");
      server.close(() => process.exit(0));
    });
  } catch (err) {
    console.error("[Server] Fatal startup error:", err);
    process.exit(1);
  }
}

bootstrap();
