import {
  toggleCheckboxBit,
  getCheckboxChunk,
  getCheckedCount,
  TOTAL_CHECKBOXES,
  CHUNK_SIZE,
} from "./checkbox.models";
import { getPublisher } from "../../common/config/db";
import { ApiError } from "../../common/utils/apiError";

export const PUBSUB_CHANNEL = "checkbox:updates";

export interface CheckboxUpdate {
  index: number;
  checked: boolean;
  userId: string;
  timestamp: number;
}

export async function toggleCheckbox(
  index: number,
  userId: string
): Promise<CheckboxUpdate> {
  if (index < 0 || index >= TOTAL_CHECKBOXES) {
    throw new ApiError(400, `Index out of range: 0 - ${TOTAL_CHECKBOXES - 1}`);
  }

  const checked = await toggleCheckboxBit(index);
  const update: CheckboxUpdate = {
    index,
    checked,
    userId,
    timestamp: Date.now(),
  };

  // Publish to Redis Pub/Sub for cross-instance broadcasting
  const publisher = getPublisher();
  await publisher.publish(PUBSUB_CHANNEL, JSON.stringify(update));

  return update;
}

export async function getCheckboxState(
  page: number,
  pageSize: number
): Promise<{ chunks: Record<number, string>; total: number; checkedCount: number }> {
  const startBit = page * pageSize;
  if (startBit >= TOTAL_CHECKBOXES) {
    return { chunks: {}, total: TOTAL_CHECKBOXES, checkedCount: 0 };
  }

  const actualSize = Math.min(pageSize, TOTAL_CHECKBOXES - startBit);
  const chunkCount = Math.ceil(actualSize / CHUNK_SIZE);
  const chunks: Record<number, string> = {};

  for (let i = 0; i < chunkCount; i++) {
    const chunkStart = startBit + i * CHUNK_SIZE;
    const chunkLen = Math.min(CHUNK_SIZE, TOTAL_CHECKBOXES - chunkStart);
    const chunkIndex = Math.floor(chunkStart / CHUNK_SIZE);
    chunks[chunkIndex] = await getCheckboxChunk(chunkStart, chunkLen);
  }

  const checkedCount = await getCheckedCount();
  return { chunks, total: TOTAL_CHECKBOXES, checkedCount };
}

export async function getFullStateForViewport(
  startIndex: number,
  count: number
): Promise<string> {
  const clampedCount = Math.min(count, TOTAL_CHECKBOXES - startIndex);
  return getCheckboxChunk(startIndex, clampedCount);
}
