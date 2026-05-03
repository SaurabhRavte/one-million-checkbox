import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { AuthProvider } from "./lib/AuthContext";
import { ClerkSync } from "./components/ClerkSync";
import { App } from "./pages/App";
import "./styles/globals.css";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const root = document.getElementById("root")!;

if (CLERK_KEY) {
  createRoot(root).render(
    <StrictMode>
      <ClerkProvider publishableKey={CLERK_KEY}>
        <AuthProvider>
          <ClerkSync />
          <App />
        </AuthProvider>
      </ClerkProvider>
    </StrictMode>
  );
} else {
  // Run without Clerk if no key provided (email/password only)
  console.warn("[Auth] VITE_CLERK_PUBLISHABLE_KEY not set. Google login disabled.");
  createRoot(root).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  );
}
