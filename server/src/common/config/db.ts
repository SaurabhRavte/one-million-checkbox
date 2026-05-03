import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType;
let redisSubscriber: RedisClientType;
let redisPublisher: RedisClientType;

export async function connectRedis(): Promise<void> {
  const url = process.env.REDIS_URL || "redis://localhost:6379";

  redisClient = createClient({ url }) as RedisClientType;
  redisSubscriber = createClient({ url }) as RedisClientType;
  redisPublisher = createClient({ url }) as RedisClientType;

  redisClient.on("error", (err) => console.error("[Redis] Client error:", err));
  redisSubscriber.on("error", (err) => console.error("[Redis] Subscriber error:", err));
  redisPublisher.on("error", (err) => console.error("[Redis] Publisher error:", err));

  await Promise.all([
    redisClient.connect(),
    redisSubscriber.connect(),
    redisPublisher.connect(),
  ]);

  console.log("[Redis] Connected successfully");
}

export function getRedis(): RedisClientType {
  if (!redisClient) throw new Error("Redis not connected");
  return redisClient;
}

export function getSubscriber(): RedisClientType {
  if (!redisSubscriber) throw new Error("Redis subscriber not connected");
  return redisSubscriber;
}

export function getPublisher(): RedisClientType {
  if (!redisPublisher) throw new Error("Redis publisher not connected");
  return redisPublisher;
}
