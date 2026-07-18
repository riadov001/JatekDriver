/**
 * SseService — Real-time event streaming for the driver app.
 *
 * Channels: driver:{id}, driver_orders:{id}, available_orders
 * Reconnects automatically with exponential backoff.
 * Falls back to polling every 12 s when SSE is unavailable or unsupported.
 *
 * Usage:
 *   SseService.start({ driverId, onEvent, onStatusChange, pollFn });
 *   SseService.stop();
 *   SseService.reconnect();  // call on network restore
 */

import { getApiBase, getServiceToken } from "@/lib/apiConfig";
import {
  SSE_FALLBACK_POLL_INTERVAL_MS,
  SSE_RECONNECT_BASE_MS,
  SSE_RECONNECT_MAX_MS,
} from "../gps/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SseStatus = "CONNECTING" | "CONNECTED" | "POLLING" | "DISCONNECTED";

export interface SseEvent {
  channel?: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

interface SseConfig {
  driverId: number;
  onEvent: (event: SseEvent) => void;
  onStatusChange: (status: SseStatus) => void;
  pollFn?: () => Promise<void>;
}

// ── Singleton state ───────────────────────────────────────────────────────────

let _config: SseConfig | null = null;
let _es: EventSource | null = null;
let _status: SseStatus = "DISCONNECTED";
let _reconnectDelay = SSE_RECONNECT_BASE_MS;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _running = false;
let _consecutiveFailures = 0;

const TYPED_EVENTS = [
  "connected",
  "order_assigned",
  "order_status",
  "order_new",
  "order_ready",
  "driver_message",
  "delivery_completed",
  "driver_location",
] as const;

// ── Internal ─────────────────────────────────────────────────────────────────

function setStatus(s: SseStatus): void {
  if (_status === s) return;
  _status = s;
  _config?.onStatusChange(s);
}

function buildUrl(): string {
  const { driverId } = _config!;
  const channels = [
    `driver:${driverId}`,
    `driver_orders:${driverId}`,
    "available_orders",
  ].join(",");
  return `${getApiBase()}/api/events?channels=${encodeURIComponent(channels)}`;
}

function stopSse(): void {
  if (_es) { _es.close(); _es = null; }
  if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
}

function stopPoll(): void {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

function startPolling(): void {
  stopPoll();
  setStatus("POLLING");
  if (!_config?.pollFn) return;
  const run = () => { _config?.pollFn?.().catch(() => {}); };
  run();
  _pollTimer = setInterval(run, SSE_FALLBACK_POLL_INTERVAL_MS);
}

function scheduleReconnect(): void {
  if (!_running) return;
  _reconnectTimer = setTimeout(() => {
    _reconnectDelay = Math.min(_reconnectDelay * 2, SSE_RECONNECT_MAX_MS);
    connectSse();
  }, _reconnectDelay);
}

function connectSse(): void {
  if (!_running || !_config) return;
  stopSse();
  setStatus("CONNECTING");

  const token = getServiceToken();
  if (!token) { startPolling(); return; }

  let es: EventSource;
  try {
    const url = buildUrl();
    // React Native EventSource (from the global polyfill) accepts a headers option.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    es = new (EventSource as any)(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    startPolling();
    return;
  }

  _es = es;

  es.onopen = () => {
    setStatus("CONNECTED");
    _reconnectDelay = SSE_RECONNECT_BASE_MS;
    _consecutiveFailures = 0;
    stopPoll();
  };

  es.onmessage = (event: MessageEvent) => {
    try {
      const payload = JSON.parse(event.data);
      _config?.onEvent({ type: "message", data: payload });
    } catch {
      // Malformed — ignore.
    }
  };

  for (const name of TYPED_EVENTS) {
    es.addEventListener(name, (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        _config?.onEvent({ type: name, data });
      } catch {
        // Ignore
      }
    });
  }

  es.onerror = () => {
    es.close();
    if (!_running) return;
    _consecutiveFailures++;
    setStatus("DISCONNECTED");

    // After repeated failures switch to polling as a safety net,
    // but keep attempting to reconnect SSE in the background.
    if (_consecutiveFailures >= 3) startPolling();
    scheduleReconnect();
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function start(config: SseConfig): void {
  if (_running) stop();
  _config = config;
  _running = true;
  _reconnectDelay = SSE_RECONNECT_BASE_MS;
  _consecutiveFailures = 0;
  connectSse();
}

export function stop(): void {
  _running = false;
  stopSse();
  stopPoll();
  setStatus("DISCONNECTED");
  _config = null;
}

/** Force immediate reconnect — call on network restore. */
export function reconnect(): void {
  if (!_running) return;
  _reconnectDelay = SSE_RECONNECT_BASE_MS;
  _consecutiveFailures = 0;
  stopPoll();
  connectSse();
}

export function getStatus(): SseStatus { return _status; }
