import { Router } from "express";
import { register, login, logout, me, clerkWebhook, clerkExchange } from "./auth.controller";
import { requireAuth } from "./auth.middleware";
import { validateBody } from "../../common/middleware/validate.middleware";
import express from "express";

const router = Router();

// Email/password auth
router.post("/register", validateBody(["email", "password"]), register);
router.post("/login", validateBody(["email", "password"]), login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);

// Clerk OAuth exchange
router.post("/clerk/exchange", validateBody(["clerkUserId", "email"]), clerkExchange);

// Clerk webhook (needs raw body)
router.post(
  "/clerk/webhook",
  express.raw({ type: "application/json" }),
  clerkWebhook
);

export default router;
