/**
 * GpsService — Production-grade GPS for a delivery driver app.
 *
 * Responsibilities:
 *  - Permission management with explicit state transitions
 *  - Quality filtering: discards inaccurate / stale / duplicate positions
 *  - Adaptive frequency: 15 s idle, 4 s during active delivery
 *  - Offline queue: positions stored when network is unavailable
 *  - Background-safe: works when screen is locked (requires standalone build)
 *
 * Usage:
 *   GpsService.init({ driverId, onPosition, onStateChange });
 *   GpsService.start();
 *   GpsService.setActiveDelivery(true);  // → 4 s interval
 *   GpsService.destroy();               // cleanup on logout
 */

import * as Location from "expo-location";
import { Platform } from "react-native";

import { getApiBase, getServiceToken } from "@/lib/apiConfig";
import { enqueue, drain } from "../sync/SyncQueue";
import type { GpsPosition, GpsState, QueuedPosition } from "./types";
import {
  GPS_ACCURACY_THRESHOLD_M,
  GPS_MAX_AGE_MS,
  GPS_MIN_DISTANCE_M,
  GPS_IDLE_INTERVAL_MS,
  GPS_ACTIVE_INTERVAL_MS,
  GPS_STALE_THRESHOLD_MS,
} from "./types";

// ── Singleton state ──────────────────────────────────────────────────────────

interface ServiceConfig {
  driverId: number;
  onPosition: (pos: GpsPosition) => void;
  onStateChange: (state: GpsState) => void;
}

let _config: ServiceConfig | null = null;
let _state: GpsState = "UNKNOWN";
let _lastPosition: GpsPosition | null = null;
let _lastSent: GpsPosition | null = null;
let _subscription: Location.LocationSubscription | null = null;
let _staleTimer: ReturnType<typeof setTimeout> | null = null;
let _activeDelivery = false;
let _initialized = false;
let _webWatchId: number | null = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function setState(next: GpsState): void {
  if (_state === next) return;
  _state = next;
  _config?.onStateChange(next);
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isQualityPosition(pos: GpsPosition): boolean {
  const age = Date.now() - pos.timestamp;
  if (age > GPS_MAX_AGE_MS) return false;
  if (pos.accuracy > GPS_ACCURACY_THRESHOLD_M) return false;
  if (!isFinite(pos.latitude) || !isFinite(pos.longitude)) return false;
  if (pos.latitude === 0 && pos.longitude === 0) return false;
  return true;
}

function isDuplicate(pos: GpsPosition): boolean {
  if (!_lastSent) return false;
  if (pos.timestamp === _lastSent.timestamp) return true;
  const dist = haversineDistance(
    pos.latitude, pos.longitude,
    _lastSent.latitude, _lastSent.longitude,
  );
  return dist < GPS_MIN_DISTANCE_M;
}

function resetStaleTimer(): void {
  if (_staleTimer) clearTimeout(_staleTimer);
  _staleTimer = setTimeout(() => {
    if (_state === "AVAILABLE") setState("TEMPORARILY_UNAVAILABLE");
  }, GPS_STALE_THRESHOLD_MS);
}

// ── Network sender ────────────────────────────────────────────────────────────

async function sendPosition(pos: GpsPosition, driverId: number): Promise<void> {
  const token = getServiceToken();
  const baseUrl = getApiBase();
  if (!token) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`${baseUrl}/api/drivers/${driverId}/location`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        latitude: pos.latitude,
        longitude: pos.longitude,
        speed: pos.speed,
        heading: pos.heading,
      }),
      signal: controller.signal,
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`HTTP ${res.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

// ── Position handler ─────────────────────────────────────────────────────────

async function handlePosition(raw: Location.LocationObject): Promise<void> {
  if (!_config) return;

  const pos: GpsPosition = {
    latitude:  raw.coords.latitude,
    longitude: raw.coords.longitude,
    accuracy:  raw.coords.accuracy ?? 999,
    speed:     raw.coords.speed,
    heading:   raw.coords.heading,
    altitude:  raw.coords.altitude,
    timestamp: raw.timestamp,
  };

  _lastPosition = pos;

  if (!isQualityPosition(pos)) {
    setState("LOW_ACCURACY");
    return;
  }

  setState("AVAILABLE");
  resetStaleTimer();
  _config.onPosition(pos);

  if (isDuplicate(pos)) return;
  _lastSent = pos;

  const { driverId } = _config;

  // Drain queued offline positions first (FIFO order).
  drain((queued) => sendPosition(queued, queued.driverId)).catch(() => {});

  try {
    await sendPosition(pos, driverId);
  } catch {
    const queued: QueuedPosition = { ...pos, driverId, attempt: 0 };
    enqueue(queued).catch(() => {});
  }
}

// ── Watcher management ────────────────────────────────────────────────────────

async function stopWatcher(): Promise<void> {
  if (_subscription) {
    _subscription.remove();
    _subscription = null;
  }
  if (_webWatchId !== null && typeof navigator !== "undefined") {
    navigator.geolocation?.clearWatch(_webWatchId);
    _webWatchId = null;
  }
}

async function startWatcher(): Promise<void> {
  await stopWatcher();
  setState("SEARCHING");

  if (Platform.OS === "web") {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState("DISABLED");
      return;
    }
    _webWatchId = navigator.geolocation.watchPosition(
      (p) => {
        handlePosition({
          coords: {
            latitude:         p.coords.latitude,
            longitude:        p.coords.longitude,
            accuracy:         p.coords.accuracy,
            altitude:         p.coords.altitude,
            altitudeAccuracy: p.coords.altitudeAccuracy,
            heading:          p.coords.heading,
            speed:            p.coords.speed,
          },
          timestamp: p.timestamp,
          mocked: false,
        });
      },
      () => setState("TEMPORARILY_UNAVAILABLE"),
      { enableHighAccuracy: true, maximumAge: 5_000 },
    );
    return;
  }

  const intervalMs = _activeDelivery ? GPS_ACTIVE_INTERVAL_MS : GPS_IDLE_INTERVAL_MS;

  try {
    _subscription = await Location.watchPositionAsync(
      {
        accuracy:         Location.Accuracy.BestForNavigation,
        timeInterval:     intervalMs,
        distanceInterval: _activeDelivery ? 3 : 8,
      },
      handlePosition,
    );
  } catch {
    setState("TEMPORARILY_UNAVAILABLE");
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface InitOptions {
  driverId: number;
  onPosition: (pos: GpsPosition) => void;
  onStateChange: (state: GpsState) => void;
}

/** Request GPS permissions. Returns whether they were granted. */
export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return true;

  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") {
    setState("PERMISSION_DENIED");
    return false;
  }

  // Background permission — for standalone/dev-client builds only.
  try {
    await Location.requestBackgroundPermissionsAsync();
  } catch {
    // Not available in Expo Go — acceptable degradation.
  }

  return true;
}

/** Initialise the GPS service. Call once after auth resolves. */
export function init(options: InitOptions): void {
  _config = options;
  _initialized = true;
  _activeDelivery = false;
}

/** Start broadcasting location. Call when driver goes online. */
export async function start(): Promise<boolean> {
  if (!_initialized || !_config) return false;
  const granted = await requestPermissions();
  if (!granted) return false;
  await startWatcher();
  return true;
}

/** Stop broadcasting. Call when driver goes offline or on logout. */
export async function stop(): Promise<void> {
  await stopWatcher();
  if (_staleTimer) { clearTimeout(_staleTimer); _staleTimer = null; }
  setState("UNKNOWN");
  _lastPosition = null;
  _lastSent = null;
}

/**
 * Switch between idle (15 s) and active-delivery (4 s) intervals.
 * Automatically restarts the watcher with the correct interval.
 */
export async function setActiveDelivery(active: boolean): Promise<void> {
  if (_activeDelivery === active) return;
  _activeDelivery = active;
  if (_subscription || _webWatchId !== null) {
    await startWatcher();
  }
}

/** Destroy — cleanup everything on logout. */
export async function destroy(): Promise<void> {
  await stop();
  _config = null;
  _initialized = false;
  _lastSent = null;
}

export function getState(): GpsState           { return _state; }
export function getLastPosition(): GpsPosition | null { return _lastPosition; }
export function isActiveDelivery(): boolean    { return _activeDelivery; }
