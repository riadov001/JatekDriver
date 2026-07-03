import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { customFetch } from "@workspace/api-client-react";

const POLL_INTERVAL_MS = 8000;
const TIMEOUT_MS = 5000;

/**
 * Polls the backend health endpoint to detect whether the API is reachable.
 * Used to surface an "offline / server unreachable" banner instead of
 * failing silently when network calls (e.g. location broadcasts, order
 * fetches) can't reach `https://ma.jatek.app`.
 */
export function useNetworkStatus() {
  const [isReachable, setIsReachable] = useState(true);
  const [checking, setChecking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkNow = useCallback(async () => {
    setChecking(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      await customFetch("/api/health", { method: "GET", signal: controller.signal });
      setIsReachable(true);
    } catch {
      setIsReachable(false);
    } finally {
      clearTimeout(timer);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkNow();
    intervalRef.current = setInterval(checkNow, POLL_INTERVAL_MS);

    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") checkNow();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [checkNow]);

  return { isReachable, checking, checkNow };
}
