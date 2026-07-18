/**
 * LocationTrackingContext — wraps GpsService + HeartbeatService.
 *
 * Exposes:
 *  - online / setOnline
 *  - gpsState  (UNKNOWN | SEARCHING | AVAILABLE | LOW_ACCURACY | …)
 *  - coords    (last validated GpsPosition)
 *  - permissionDenied
 *  - toggling
 *  - setActiveDelivery (4 s GPS interval during active delivery)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert, Platform } from "react-native";

import * as Location from "expo-location";
import * as GpsService from "@/services/gps/GpsService";
import * as HeartbeatService from "@/services/heartbeat/HeartbeatService";
import { drain } from "@/services/sync/SyncQueue";
import { getApiBase, setServiceToken } from "@/lib/apiConfig";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useAuth } from "./AuthContext";
import type { GpsState, GpsPosition } from "@/services/gps/types";
import { updateDriver } from "@workspace/api-client-react";

// ── Context shape ────────────────────────────────────────────────────────────

interface LocationTrackingValue {
  readonly online: boolean;
  readonly gpsState: GpsState;
  readonly coords: GpsPosition | null;
  readonly permissionDenied: boolean;
  readonly toggling: boolean;
  readonly setOnline: (next: boolean) => Promise<void>;
  readonly setActiveDelivery: (active: boolean) => Promise<void>;
  readonly requestPermission: () => Promise<boolean>;
  readonly refreshOnce: () => Promise<GpsPosition | null>;
}

const Ctx = createContext<LocationTrackingValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function LocationTrackingProvider({ children }: { children: ReactNode }) {
  const { driverId, driver, token, refreshDriver } = useAuth();
  const { isReachable: isConnected } = useNetworkStatus();

  const [online, setOnlineState] = useState(false);
  const [gpsState, setGpsState] = useState<GpsState>("UNKNOWN");
  const [coords, setCoords] = useState<GpsPosition | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [toggling, setToggling] = useState(false);

  const driverIdRef = useRef<number | null>(driverId);
  useEffect(() => { driverIdRef.current = driverId; }, [driverId]);

  // Keep service token in sync with auth token.
  useEffect(() => {
    setServiceToken(token);
  }, [token]);

  // Restore online state from driver profile on mount / login.
  useEffect(() => {
    if (driver) setOnlineState(!!driver.isAvailable);
  }, [driver?.id, driver?.isAvailable]);

  // Init GPS service when auth resolves.
  useEffect(() => {
    if (!driverId) return;
    GpsService.init({
      driverId,
      onPosition: (pos) => {
        setCoords(pos);
        setGpsState("AVAILABLE");
      },
      onStateChange: (state) => {
        setGpsState(state);
        if (state === "PERMISSION_DENIED") setPermissionDenied(true);
      },
    });
  }, [driverId]);

  // Destroy on unmount.
  useEffect(() => {
    return () => {
      GpsService.destroy().catch(() => {});
      HeartbeatService.stop();
    };
  }, []);

  // On network restore, drain queued offline GPS positions.
  useEffect(() => {
    if (!isConnected || !driverIdRef.current) return;
    drain(async (pos) => {
      const tok = token;
      if (!tok) throw new Error("no token");
      const res = await fetch(
        `${getApiBase()}/api/drivers/${pos.driverId}/location`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tok}`,
          },
          body: JSON.stringify({ latitude: pos.latitude, longitude: pos.longitude }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }).catch(() => {});
  }, [isConnected, token]);

  // Auto-restart watcher if already marked online (e.g. app resume).
  useEffect(() => {
    if (online && driverId && token) {
      GpsService.start().catch(() => {});
    }
  }, [online, driverId, token]);

  // ── Public actions ──────────────────────────────────────────────────────

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await GpsService.requestPermissions();
    setPermissionDenied(!granted);
    return granted;
  }, []);

  const setOnline = useCallback(async (next: boolean) => {
    setToggling(true);
    try {
      let id = driverIdRef.current;
      if (!id) {
        try {
          const drv = await refreshDriver();
          id = drv?.id ?? null;
          if (id) driverIdRef.current = id;
        } catch { /* ignore */ }
      }

      if (!id) {
        Alert.alert(
          "Profil introuvable",
          "Impossible de charger votre profil. Veuillez vous reconnecter.",
        );
        return;
      }

      if (next) {
        const granted = await requestPermission();
        if (!granted) return;

        try { await updateDriver(id, { isAvailable: true }); } catch { /* non-fatal */ }

        GpsService.init({
          driverId: id,
          onPosition: (pos) => { setCoords(pos); setGpsState("AVAILABLE"); },
          onStateChange: (state) => {
            setGpsState(state);
            if (state === "PERMISSION_DENIED") setPermissionDenied(true);
          },
        });

        const started = await GpsService.start();
        if (!started) { setPermissionDenied(true); return; }

        HeartbeatService.start(id);
        setOnlineState(true);
      } else {
        HeartbeatService.stop();
        await GpsService.stop();
        try { await updateDriver(id, { isAvailable: false }); } catch { /* non-fatal */ }
        setOnlineState(false);
        setGpsState("UNKNOWN");
        setCoords(null);
      }
    } finally {
      setToggling(false);
    }
  }, [requestPermission, refreshDriver]);

  const setActiveDelivery = useCallback(async (active: boolean) => {
    await GpsService.setActiveDelivery(active);
  }, []);

  /** One-shot position fetch — used by the map screen before GPS is started. */
  const refreshOnce = useCallback(async (): Promise<GpsPosition | null> => {
    const granted = await GpsService.requestPermissions();
    if (!granted) { setPermissionDenied(true); return null; }
    try {
      if (Platform.OS === "web") {
        return new Promise((resolve) => {
          if (typeof navigator === "undefined" || !navigator.geolocation) { resolve(null); return; }
          navigator.geolocation.getCurrentPosition(
            (p) => {
              const pos: GpsPosition = {
                latitude: p.coords.latitude, longitude: p.coords.longitude,
                accuracy: p.coords.accuracy ?? 999, speed: p.coords.speed,
                heading: p.coords.heading, altitude: p.coords.altitude,
                timestamp: p.timestamp,
              };
              setCoords(pos);
              resolve(pos);
            },
            () => resolve(null),
            { enableHighAccuracy: true },
          );
<<<<<<< HEAD
        });
=======
          return;
        }

        if (next) {
          // Block go-online if the driver's profile is not yet complete.
          // Prefer a fresh fetch; fall back to the cached driver from context
          // so transient network errors don't produce a false "profil incomplet".
          const freshDriver = await refreshDriver();
          const profileDone = freshDriver
            ? !!freshDriver.profileCompletedAt
            : !!driver?.profileCompletedAt;
          if (!profileDone) {
            Alert.alert(
              "Profil incomplet",
              "Veuillez compléter votre profil avant de passer en ligne.",
            );
            return;
          }

          const ok = await requestPermission();
          if (!ok) {
            setOnlineState(false);
            return;
          }
          try {
            await updateDriver(id, { isAvailable: true });
          } catch {
            // ignore — we'll still start tracking
          }
          setOnlineState(true);
          await startWatcher();
        } else {
          stopWatcher();
          try {
            await updateDriver(id, { isAvailable: false });
          } catch {
            // ignore
          }
          setOnlineState(false);
        }
      } finally {
        setToggling(false);
>>>>>>> f24c0f5195b5fe178633cac7dd4f567c249e8539
      }
      const raw = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const pos: GpsPosition = {
        latitude: raw.coords.latitude, longitude: raw.coords.longitude,
        accuracy: raw.coords.accuracy ?? 999, speed: raw.coords.speed,
        heading: raw.coords.heading, altitude: raw.coords.altitude,
        timestamp: raw.timestamp,
      };
      setCoords(pos);
      return pos;
    } catch {
      return null;
    }
  }, []);

  // ── Value ────────────────────────────────────────────────────────────────

  const value = useMemo<LocationTrackingValue>(() => ({
    online,
    gpsState,
    coords,
    permissionDenied,
    toggling,
    setOnline,
    setActiveDelivery,
    requestPermission,
    refreshOnce,
  }), [online, gpsState, coords, permissionDenied, toggling, setOnline, setActiveDelivery, requestPermission, refreshOnce]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocationTracking(): LocationTrackingValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLocationTracking must be inside LocationTrackingProvider");
  return v;
}
