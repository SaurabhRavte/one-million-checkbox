import { Response, NextFunction } from "express";
import { AuthRequest } from "../auth/auth.middleware";
import { toggleCheckbox, getCheckboxState, getFullStateForViewport } from "./checkbox.services";
import { sendSuccess, sendError } from "../../common/utils/apiResponse";
import { checkRateLimit } from "./checkbox.ratelimit";

export async function toggle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const index = parseInt(req.params.index, 10);
    if (isNaN(index)) {
      sendError(res, "Invalid index", 400);
      return;
    }

    // Per-user rate limit: 30 toggles per 10 seconds
    const rl = await checkRateLimit(userId, 30, 10_000, "http_toggle");
    if (!rl.allowed) {
      sendError(res, "Rate limit exceeded. Max 30 toggles per 10 seconds.", 429);
      return;
    }

    const update = await toggleCheckbox(index, userId);
    sendSuccess(res, update, "Toggled");
  } catch (err) {
    next(err);
  }
}

export async function getState(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt((req.query.page as string) || "0", 10);
    const pageSize = parseInt((req.query.pageSize as string) || "100000", 10);
    const clamped = Math.min(pageSize, 100_000);

    const state = await getCheckboxState(page, clamped);
    sendSuccess(res, state, "Checkbox state");
  } catch (err) {
    next(err);
  }
}

export async function getViewport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const start = parseInt((req.query.start as string) || "0", 10);
    const count = parseInt((req.query.count as string) || "10000", 10);
    const clamped = Math.min(count, 50_000);

    const chunk = await getFullStateForViewport(start, clamped);
    sendSuccess(res, { start, count: clamped, data: chunk }, "Viewport state");
  } catch (err) {
    next(err);
  }
}
