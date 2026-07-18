/**
 * HeartbeatService — keeps the driver visible to the backend.
 *
 * The backend marks a driver offline after 30 s without any activity.
 * This service sends a lightweight ping every 20 s, independent of GPS.
 * Even if no new GPS fix is available, the driver remains "online".
 *
 * Usage:
 *   HeartbeatService.start(driverId);
 *   HeartbeatService.stop();
 */

import { getApiBase, getServiceToken } from "@/lib/apiConfig";
import { HEARTBEAT_INTERVAL_MS } from "../gps/types";

let _timer: ReturnType<typeof setInterval> | null = null;
let _driverId: number | null = null;
let _running = false;

async function ping(): Promise<void> {
  const token = getServiceToken();
  const id = _driverId;
  if (!token || !id) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    await fetch(`${getApiBase()}/api/drivers/${id}/heartbeat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
  } catch {
    // Non-fatal — GPS location updates also reset the online timer.
  } finally {
    clearTimeout(timeout);
  }
}

export function start(driverId: number): void {
  if (_running) stop();
  _driverId = driverId;
  _running = true;

  // Immediate first ping.
  ping().catch(() => {});

  _timer = setInterval(() => {
    ping().catch(() => {});
  }, HEARTBEAT_INTERVAL_MS);
}

export function stop(): void {
  if (_timer) { clearInterval(_timer); _timer = null; }
  _running = false;
  _driverId = null;
}

export function isRunning(): boolean { return _running; }
