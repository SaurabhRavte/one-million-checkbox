import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { sendError } from "../utils/apiResponse";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  console.error("[Unhandled Error]", err);
  sendError(res, "Internal server error", 500);
}

export function validateBody(
  requiredFields: string[]
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = requiredFields.filter((f) => !(f in req.body));
    if (missing.length > 0) {
      sendError(res, `Missing fields: ${missing.join(", ")}`, 400);
      return;
    }
    next();
  };
}
