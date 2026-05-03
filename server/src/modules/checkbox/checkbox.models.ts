import { getRedis } from "../../common/config/db";

// 1,000,000 checkboxes stored as Redis bitfield
// Each bit = one checkbox state (0 = unchecked, 1 = checked)
// Total: 125,000 bytes = ~122 KB
export const TOTAL_CHECKBOXES = 1_000_000;
export const BITFIELD_KEY = "checkboxes:bitfield";
export const CHUNK_SIZE = 4096; // bits per chunk for bulk reads

export async function getCheckboxBit(index: number): Promise<boolean> {
  const redis = getRedis();
  const result = await redis.getBit(BITFIELD_KEY, index);
  return result === 1;
}

export async function setCheckboxBit(index: number, value: 0 | 1): Promise<boolean> {
  const redis = getRedis();
  // Returns old value
  const old = await redis.setBit(BITFIELD_KEY, index, value);
  return old !== value; // true if changed
}

export async function toggleCheckboxBit(index: number): Promise<boolean> {
  const redis = getRedis();
  const current = await redis.getBit(BITFIELD_KEY, index);
  const newVal = current === 0 ? 1 : 0;
  await redis.setBit(BITFIELD_KEY, index, newVal as 0 | 1);
  return newVal === 1;
}

/**
 * Get a range of checkbox states as a Buffer (bitfield chunk)
 * Returns base64-encoded bit string for the chunk
 */
export async function getCheckboxChunk(
  startBit: number,
  lengthBits: number
): Promise<string> {
  const redis = getRedis();
  const startByte = Math.floor(startBit / 8);
  const byteCount = Math.ceil(lengthBits / 8);

  const raw = await redis.getRange(BITFIELD_KEY, startByte, startByte + byteCount - 1);
  if (!raw) {
    return Buffer.alloc(byteCount).toString("base64");
  }
  return Buffer.from(raw).toString("base64");
}

/**
 * Get total checked count
 */
export async function getCheckedCount(): Promise<number> {
  const redis = getRedis();
  // BITCOUNT on the whole key
  return redis.bitCount(BITFIELD_KEY);
}
