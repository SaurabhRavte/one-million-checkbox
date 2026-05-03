import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User } from "../types";
import { api } from "../lib/api";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  setClerkAuth: (clerkUserId: string, email: string, name?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "omcb_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) { setIsLoading(false); return; }

    api.auth.me(saved)
      .then((res) => { setUser(res.data); setToken(saved); })
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setToken(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const persist = (u: User, t: string) => {
    setUser(u); setToken(t);
    localStorage.setItem(TOKEN_KEY, t);
  };

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    persist(res.data.user, res.data.token);
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const res = await api.auth.register(email, password, name);
    persist(res.data.user, res.data.token);
  }, []);

  const logout = useCallback(async () => {
    if (token) await api.auth.logout(token).catch(() => {});
    setUser(null); setToken(null);
    localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  const setClerkAuth = useCallback(async (clerkUserId: string, email: string, name?: string) => {
    const res = await api.auth.clerkExchange(clerkUserId, email, name);
    persist(res.data.user, res.data.token);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, setClerkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
