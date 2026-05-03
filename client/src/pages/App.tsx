import { useCallback, useState, useRef } from "react";
import { useAuth } from "../lib/AuthContext";
import { useWebSocket } from "../hooks/useWebSocket";
import { useCheckboxState } from "../hooks/useCheckboxState";
import { CheckboxGrid } from "../components/CheckboxGrid";
import { Header } from "../components/Header";
import { WsMessage } from "../types";

export function App() {
  const { user, token, isLoading } = useAuth();
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [rerender, setRerender] = useState(0);
  const pendingToggles = useRef<Set<number>>(new Set());

  const {
    getBit,
    toggleLocal,
    applyRemoteUpdate,
    loadViewport,
    checkedCount,
  } = useCheckboxState(token);

  const handleWsMessage = useCallback((msg: WsMessage) => {
    if (msg.type === "connected") {
      setWsConnected(true);
      setConnectedUsers((msg.connectedUsers as number) || 0);
    } else if (msg.type === "stats") {
      setConnectedUsers((msg.connectedUsers as number) || 0);
    } else if (msg.type === "checkbox_update") {
      const index = msg.index as number;
      // Ignore our own optimistic updates
      if (!pendingToggles.current.has(index)) {
        applyRemoteUpdate(index, msg.checked as boolean);
        setRerender(r => r + 1);
      }
    } else if (msg.type === "toggle_ok") {
      // Confirm - remove from pending
      pendingToggles.current.delete(msg.index as number);
    } else if (msg.type === "toggle_error" || msg.type === "rate_limited") {
      // Revert optimistic update
      const index = msg.index as number;
      if (index !== undefined) {
        pendingToggles.current.delete(index);
        toggleLocal(index); // toggle back
        setRerender(r => r + 1);
      }
    }
  }, [applyRemoteUpdate, toggleLocal]);

  const { connected, sendToggle } = useWebSocket({
    token,
    onMessage: handleWsMessage,
    onConnectedCount: setConnectedUsers,
  });

  const handleToggle = useCallback((index: number) => {
    if (!user) return;
    // Optimistic update
    pendingToggles.current.add(index);
    toggleLocal(index);
    setRerender(r => r + 1);
    // Send via WebSocket
    sendToggle(index);
  }, [user, toggleLocal, sendToggle]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
        <span className="font-mono text-[#333] text-sm animate-pulse">loading...</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0a]">
      <Header
        connectedUsers={connectedUsers}
        checkedCount={checkedCount}
        wsConnected={connected}
      />
      <main className="flex-1 overflow-hidden mt-12">
        <CheckboxGrid
          getBit={getBit}
          onToggle={handleToggle}
          loadViewport={loadViewport}
          rerender={rerender}
        />
      </main>
    </div>
  );
}
