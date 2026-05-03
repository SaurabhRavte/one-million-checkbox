import { Request, Response, NextFunction } from "express";
import { registerUser, loginUser, logoutUser, createClerkSession } from "./auth.services";
import { upsertClerkUser } from "./auth.models";
import { sendSuccess, sendError } from "../../common/utils/apiResponse";
import { AuthRequest } from "./auth.middleware";
import { Webhook } from "svix";

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name } = req.body;
    const result = await registerUser({ email, password, name });
    sendSuccess(res, result, "Registered successfully", 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });
    sendSuccess(res, result, "Logged in successfully");
  } catch (err) {
    next(err);
  }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers.authorization?.slice(7);
    if (token) await logoutUser(token);
    sendSuccess(res, null, "Logged out");
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  sendSuccess(res, req.user, "User info");
}

/**
 * Clerk webhook handler - syncs user creation/updates from Clerk OAuth
 */
export async function clerkWebhook(req: Request, res: Response): Promise<void> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    sendError(res, "Webhook not configured", 500);
    return;
  }

  try {
    const wh = new Webhook(webhookSecret);
    const payload = wh.verify(req.body as string, {
      "svix-id": req.headers["svix-id"] as string,
      "svix-timestamp": req.headers["svix-timestamp"] as string,
      "svix-signature": req.headers["svix-signature"] as string,
    }) as { type: string; data: { id: string; email_addresses: Array<{ email_address: string }>; first_name?: string; last_name?: string } };

    if (payload.type === "user.created" || payload.type === "user.updated") {
      const { id, email_addresses, first_name, last_name } = payload.data;
      const email = email_addresses[0]?.email_address;
      const name = [first_name, last_name].filter(Boolean).join(" ") || undefined;
      await upsertClerkUser(id, email, name);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[Clerk Webhook]", err);
    sendError(res, "Invalid webhook signature", 400);
  }
}

/**
 * Exchange Clerk session token for our internal session token
 */
export async function clerkExchange(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { clerkUserId, email, name } = req.body;
    if (!clerkUserId || !email) {
      sendError(res, "Missing clerkUserId or email", 400);
      return;
    }
    const user = await upsertClerkUser(clerkUserId, email, name);
    const token = await createClerkSession(user.id);
    sendSuccess(res, { user, token }, "Authenticated via Clerk");
  } catch (err) {
    next(err);
  }
}
