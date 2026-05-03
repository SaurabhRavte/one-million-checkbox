import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { AuthModal } from "./AuthModal";

interface HeaderProps {
  connectedUsers: number;
  checkedCount: number;
  wsConnected: boolean;
}

export function Header({ connectedUsers, checkedCount, wsConnected }: HeaderProps) {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 sm:px-6 h-12">
          {/* Left: title */}
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-sm tracking-tight">
              1,000,000 ☑
            </span>
            <span className="text-[#444] hidden sm:inline text-xs font-mono">by saurabh</span>
          </div>

          {/* Center: stats */}
          <div className="flex items-center gap-4 text-xs font-mono text-[#555]">
            <span>
              <span className="text-white">{checkedCount.toLocaleString()}</span>
              <span className="text-[#333]">/1,000,000</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span>{connectedUsers} online</span>
            </span>
          </div>

          {/* Right: auth */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative">
                <button
                  className="flex items-center gap-2 text-xs text-[#888] hover:text-white transition-colors"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <div className="w-6 h-6 bg-[#222] border border-[#333] flex items-center justify-center text-[10px] font-mono">
                    {(user.name?.[0] || user.email[0]).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline">{user.name || user.email.split("@")[0]}</span>
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-8 bg-[#111] border border-[#222] shadow-xl min-w-[140px] z-50">
                    <div className="px-3 py-2 text-[10px] text-[#555] border-b border-[#222] font-mono">
                      {user.email}
                    </div>
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-[#888] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                      onClick={() => { logout(); setShowMenu(false); }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="btn btn-ghost text-xs px-3 py-1.5"
                onClick={() => setShowAuth(true)}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
