import { Request, Response, NextFunction } from "express";
import { verifySession } from "./auth.services";
import { AuthUserDto } from "./dto/register.dto";
import { sendError } from "../../common/utils/apiResponse";

export interface AuthRequest extends Request {
  user?: AuthUserDto;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, "No token provided", 401);
    return;
  }

  const token = authHeader.slice(7);
  const user = await verifySession(token);

  if (!user) {
    sendError(res, "Invalid or expired session", 401);
    return;
  }

  req.user = user;
  next();
}

export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = await verifySession(token);
    if (user) req.user = user;
  }
  next();
}
