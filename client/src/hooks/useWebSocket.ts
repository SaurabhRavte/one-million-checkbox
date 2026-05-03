import { useEffect, useRef, useCallback, useState } from "react";
import { WsMessage } from "../types";

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}`;

interface UseWebSocketOptions {
  token: string | null;
  onMessage: (msg: WsMessage) => void;
  onConnectedCount?: (count: number) => void;
}

export function useWebSocket({ token, onMessage, onConnectedCount }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const [connected, setConnected] = useState(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Authenticate if we have a token
      if (tokenRef.current) {
        ws.send(JSON.stringify({ type: "auth", token: tokenRef.current }));
      }
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMessage;
        if (msg.type === "stats" && onConnectedCount) {
          onConnectedCount(msg.connectedUsers as number);
        }
        onMessage(msg);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [onMessage, onConnectedCount]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // Re-auth when token changes
  useEffect(() => {
    if (token && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "auth", token }));
    }
  }, [token]);

  const sendToggle = useCallback((index: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "toggle", index }));
    }
  }, []);

  return { connected, sendToggle };
}
