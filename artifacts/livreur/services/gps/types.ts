/**
 * GPS service types — mirrors the full set of location states a driver
 * can be in. Every state has a corresponding UI.
 */

export type GpsState =
  | "UNKNOWN"
  | "SEARCHING"
  | "AVAILABLE"
  | "LOW_ACCURACY"
  | "TEMPORARILY_UNAVAILABLE"
  | "DISABLED"
  | "PERMISSION_DENIED";

/** Full GPS position with all quality fields */
export interface GpsPosition {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy: number;        // metres
  readonly speed: number | null;    // m/s
  readonly heading: number | null;  // degrees
  readonly altitude: number | null; // metres
  readonly timestamp: number;       // ms epoch
}

/** A queued position that failed to send (offline) */
export interface QueuedPosition extends GpsPosition {
  readonly driverId: number;
  readonly attempt: number;
}

// ── Quality thresholds ──────────────────────────────────────────────────────
/** Positions with accuracy worse than this are discarded */
export const GPS_ACCURACY_THRESHOLD_M = 50;
/** Positions older than this are discarded */
export const GPS_MAX_AGE_MS = 30_000;
/** Minimum distance moved to consider a position "new" */
export const GPS_MIN_DISTANCE_M = 5;

// ── Polling intervals ────────────────────────────────────────────────────────
/** Update interval when online but no active delivery */
export const GPS_IDLE_INTERVAL_MS = 15_000;
/** Update interval during an active delivery */
export const GPS_ACTIVE_INTERVAL_MS = 4_000;
/** Time before declaring the GPS "temporarily unavailable" */
export const GPS_STALE_THRESHOLD_MS = 45_000;

// ── Heartbeat ────────────────────────────────────────────────────────────────
/** Backend marks a driver offline after 30 s — heartbeat runs at 20 s */
export const HEARTBEAT_INTERVAL_MS = 20_000;

// ── SSE fallback ─────────────────────────────────────────────────────────────
export const SSE_FALLBACK_POLL_INTERVAL_MS = 12_000;
export const SSE_RECONNECT_BASE_MS = 1_000;
export const SSE_RECONNECT_MAX_MS = 30_000;
