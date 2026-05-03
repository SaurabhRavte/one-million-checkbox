import { getRedis } from "../../common/config/db";
import { AuthUserDto } from "./dto/register.dto";

const USER_PREFIX = "user:";
const EMAIL_INDEX_PREFIX = "email_idx:";

export async function createUser(user: AuthUserDto): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.multi();
  pipeline.set(`${USER_PREFIX}${user.id}`, JSON.stringify(user));
  pipeline.set(`${EMAIL_INDEX_PREFIX}${user.email}`, user.id);
  await pipeline.exec();
}

export async function findUserById(id: string): Promise<AuthUserDto | null> {
  const redis = getRedis();
  const raw = await redis.get(`${USER_PREFIX}${id}`);
  if (!raw) return null;
  return JSON.parse(raw) as AuthUserDto;
}

export async function findUserByEmail(email: string): Promise<AuthUserDto | null> {
  const redis = getRedis();
  const id = await redis.get(`${EMAIL_INDEX_PREFIX}${email}`);
  if (!id) return null;
  return findUserById(id);
}

export async function upsertClerkUser(clerkId: string, email: string, name?: string): Promise<AuthUserDto> {
  const existing = await findUserById(clerkId);
  if (existing) return existing;

  const user: AuthUserDto = {
    id: clerkId,
    email,
    name,
    provider: "google",
    createdAt: Date.now(),
  };
  await createUser(user);
  return user;
}
