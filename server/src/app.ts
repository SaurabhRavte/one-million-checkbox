import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import checkboxRoutes from "./modules/checkbox/checkbox.routes";
import { errorHandler } from "./common/middleware/validate.middleware";

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));

// Body parsers (skip for webhook route which needs raw body)
app.use((req, res, next) => {
  if (req.path === "/api/auth/clerk/webhook") return next();
  express.json()(req, res, next);
});

app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/checkbox", checkboxRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use(errorHandler);

export default app;
