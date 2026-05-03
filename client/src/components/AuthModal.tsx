import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { useClerk, useSignIn, useSignUp, SignIn, SignUp } from "@clerk/clerk-react";

type Mode = "login" | "register" | "clerk_login" | "clerk_register";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name || undefined);
      }
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === "clerk_login") {
    return (
      <ModalWrapper onClose={onClose}>
        <SignIn afterSignInUrl="/" signUpUrl="#" />
        <button className="btn btn-ghost w-full mt-3 text-xs" onClick={() => setMode("login")}>
          ← use email/password instead
        </button>
      </ModalWrapper>
    );
  }

  if (mode === "clerk_register") {
    return (
      <ModalWrapper onClose={onClose}>
        <SignUp afterSignUpUrl="/" signInUrl="#" />
        <button className="btn btn-ghost w-full mt-3 text-xs" onClick={() => setMode("register")}>
          ← use email/password instead
        </button>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper onClose={onClose}>
      <div className="mb-6">
        <p className="text-[10px] text-[#555] uppercase tracking-[0.3em] mb-1">One Million Checkboxes</p>
        <h2 className="text-lg font-semibold">
          {mode === "login" ? "Sign in" : "Create account"}
        </h2>
      </div>

      {mode === "register" && (
        <div className="mb-4">
          <label className="label">Name (optional)</label>
          <input
            className="input"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
      )}

      <div className="mb-4">
        <label className="label">Email</label>
        <input
          className="input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />
      </div>

      <div className="mb-5">
        <label className="label">Password</label>
        <input
          className="input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />
      </div>

      {error && (
        <p className="text-red-400 text-xs mb-4 border border-red-900 px-3 py-2 bg-red-950/30">{error}</p>
      )}

      <button
        className="btn btn-primary w-full mb-3"
        onClick={handleSubmit}
        disabled={loading || !email || !password}
      >
        {loading ? "Loading..." : mode === "login" ? "Sign in" : "Create account"}
      </button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#222]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#111] px-3 text-[11px] text-[#555]">or continue with</span>
        </div>
      </div>

      <button
        className="btn btn-ghost w-full flex items-center justify-center gap-2 mb-4"
        onClick={() => setMode(mode === "login" ? "clerk_login" : "clerk_register")}
      >
        <GoogleIcon />
        Google
      </button>

      <p className="text-center text-xs text-[#555]">
        {mode === "login" ? "No account?" : "Have an account?"}{" "}
        <button
          className="text-white underline underline-offset-2"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Register" : "Sign in"}
        </button>
      </p>
    </ModalWrapper>
  );
}

function ModalWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-sm mx-4 z-10 shadow-2xl">
        <button
          className="absolute top-4 right-4 text-[#555] hover:text-white text-lg leading-none"
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
