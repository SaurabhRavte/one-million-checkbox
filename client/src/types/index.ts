export interface User {
  id: string;
  email: string;
  name?: string;
  provider: "email" | "google";
  createdAt: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export interface CheckboxUpdate {
  type: "checkbox_update";
  index: number;
  checked: boolean;
  userId: string;
  timestamp: number;
}

export interface WsMessage {
  type: string;
  [key: string]: unknown;
}

export interface StatsMessage {
  type: "stats";
  connectedUsers: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  timestamp: number;
}
