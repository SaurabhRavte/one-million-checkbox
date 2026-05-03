import { ApiResponse, User } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "";

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data as ApiResponse<T>;
}

export const api = {
  auth: {
    register: (email: string, password: string, name?: string) =>
      request<{ user: User; token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      }),

    login: (email: string, password: string) =>
      request<{ user: User; token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    logout: (token: string) =>
      request("/api/auth/logout", { method: "POST" }, token),

    me: (token: string) =>
      request<User>("/api/auth/me", {}, token),

    clerkExchange: (clerkUserId: string, email: string, name?: string) =>
      request<{ user: User; token: string }>("/api/auth/clerk/exchange", {
        method: "POST",
        body: JSON.stringify({ clerkUserId, email, name }),
      }),
  },

  checkbox: {
    getViewport: (start: number, count: number, token?: string | null) =>
      request<{ start: number; count: number; data: string }>(
        `/api/checkbox/viewport?start=${start}&count=${count}`,
        {},
        token
      ),
  },
};
