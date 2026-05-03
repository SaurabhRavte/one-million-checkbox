import { getRedis } from "../../common/config/db";
import { ApiError } from "../../common/utils/apiError";
import { AuthUserDto, RegisterDto, LoginDto } from "./dto/register.dto";
import {
  createUser,
  findUserByEmail,
  findUserById,
} from "./auth.models";
import crypto from "crypto";

const SESSION_PREFIX = "session:";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + process.env.CLERK_SECRET_KEY || "salt").digest("hex");
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function registerUser(dto: RegisterDto): Promise<{ user: AuthUserDto; token: string }> {
  const existing = await findUserByEmail(dto.email);
  if (existing) throw new ApiError(409, "Email already registered");

  const user: AuthUserDto = {
    id: crypto.randomUUID(),
    email: dto.email,
    name: dto.name,
    provider: "email",
    createdAt: Date.now(),
  };

  // Store hashed password separately
  const redis = getRedis();
  await redis.set(`pwd:${user.id}`, hashPassword(dto.password));
  await createUser(user);

  const token = generateSessionToken();
  await redis.setEx(`${SESSION_PREFIX}${token}`, SESSION_TTL, user.id);

  return { user, token };
}

export async function loginUser(dto: LoginDto): Promise<{ user: AuthUserDto; token: string }> {
  const user = await findUserByEmail(dto.email);
  if (!user) throw new ApiError(401, "Invalid credentials");
  if (user.provider !== "email") throw new ApiError(401, "Please use Google login");

  const redis = getRedis();
  const storedHash = await redis.get(`pwd:${user.id}`);
  if (!storedHash || storedHash !== hashPassword(dto.password)) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = generateSessionToken();
  await redis.setEx(`${SESSION_PREFIX}${token}`, SESSION_TTL, user.id);

  return { user, token };
}

export async function verifySession(token: string): Promise<AuthUserDto | null> {
  const redis = getRedis();
  const userId = await redis.get(`${SESSION_PREFIX}${token}`);
  if (!userId) return null;
  return findUserById(userId);
}

export async function logoutUser(token: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`${SESSION_PREFIX}${token}`);
}

export async function createClerkSession(clerkUserId: string): Promise<string> {
  const redis = getRedis();
  const token = generateSessionToken();
  await redis.setEx(`${SESSION_PREFIX}${token}`, SESSION_TTL, clerkUserId);
  return token;
}
