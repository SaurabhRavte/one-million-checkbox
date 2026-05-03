import { Router } from "express";
import { toggle, getState, getViewport } from "./checkbox.controller";
import { requireAuth, optionalAuth } from "../auth/auth.middleware";
import { createRateLimiter } from "./checkbox.ratelimit";

const router = Router();

// Rate limiter: 100 requests per 60 seconds per IP for state reads
const readLimiter = createRateLimiter(100, 60_000, "http_read");

// Get full state (paginated)
router.get("/state", readLimiter, optionalAuth, getState);

// Get viewport-specific state
router.get("/viewport", readLimiter, optionalAuth, getViewport);

// Toggle a checkbox (auth required)
router.post("/toggle/:index", requireAuth, toggle);

export default router;
