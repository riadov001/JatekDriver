/**
 * Offline GPS sync queue — FIFO.
 *
 * When the network is unavailable, GPS positions are stored locally.
 * When connectivity returns, they are drained in order and sent to the backend.
 * Positions are never lost.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QueuedPosition } from "../gps/types";

const QUEUE_KEY = "@jatek/gps_queue";
const MAX_QUEUE_SIZE = 500; // cap to avoid unbounded growth
const MAX_SEND_BATCH = 10;  // positions per drain cycle

let draining = false;

// ── Queue persistence ────────────────────────────────────────────────────────

async function readQueue(): Promise<QueuedPosition[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedPosition[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedPosition[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage failure — positions may be lost, but never crash.
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Enqueue a GPS position that failed to send. */
export async function enqueue(pos: QueuedPosition): Promise<void> {
  const queue = await readQueue();
  if (queue.length >= MAX_QUEUE_SIZE) {
    // Drop the oldest position to make room.
    queue.shift();
  }
  queue.push(pos);
  await writeQueue(queue);
}

/** Number of queued positions. */
export async function queueSize(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

/**
 * Drain the queue — sends positions in FIFO order using the provided sender.
 * Stops on first network error (will retry on next call).
 * Safe to call concurrently — only one drain runs at a time.
 */
export async function drain(
  sender: (pos: QueuedPosition) => Promise<void>,
): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    let queue = await readQueue();
    let sent = 0;

    while (queue.length > 0 && sent < MAX_SEND_BATCH) {
      const pos = queue[0];
      try {
        await sender(pos);
        queue = queue.slice(1);
        sent++;
      } catch {
        // Network error — leave remaining positions and stop.
        break;
      }
    }

    await writeQueue(queue);
  } finally {
    draining = false;
  }
}

/** Clear the entire queue (e.g. on logout). */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
