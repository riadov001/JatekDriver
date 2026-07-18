---
name: Jatek Driver architecture v1
description: Full rebuild of artifacts/livreur — new service layer, i18n, GPS quality filtering, SSE, heartbeat, offline queue.
---

## What was built (July 2026)

### New files
- `services/gps/types.ts` — GpsState enum, GpsPosition, quality constants (50m accuracy threshold, 15s idle / 4s delivery intervals)
- `services/gps/GpsService.ts` — GPS singleton: quality filter (>50m discarded), dedup by distance (<5m = skip), offline queue drain, adaptive interval, background-safe
- `services/heartbeat/HeartbeatService.ts` — 20s ping independent of GPS; stops backend from marking driver offline (backend timeout = 30s)
- `services/sse/SseService.ts` — SSE with exponential backoff; falls back to polling every 12s after 3 failures; reconnects on network restore
- `services/sync/SyncQueue.ts` — FIFO offline GPS queue via AsyncStorage; drains on network restore
- `lib/apiConfig.ts` — singleton for resolved API base URL + service token; `setApiBase()` / `getApiBase()` / `setServiceToken()` / `getServiceToken()` used by all services (avoids passing URL/token through every call)
- `i18n/types.ts` + `fr.ts` / `ar.ts` / `en.ts` / `index.ts` — lightweight i18n, no dep, detectLocale() called in _layout.tsx
- `types/errors.ts` — AppError class, categorizeError(), 7 error categories
- `types/order.ts` — OrderMachineState, VALID_TRANSITIONS, API_STATUS_TO_MACHINE, DeclineReason
- `components/GpsStatusBanner.tsx` — non-blocking banner for every GpsState != AVAILABLE; uses `destructive` color for errors

### Updated files
- `contexts/LocationTrackingContext.tsx` — wraps GpsService + HeartbeatService; exposes gpsState, setActiveDelivery, refreshOnce; uses isReachable from useNetworkStatus
- `contexts/NewOrderAlertContext.tsx` — uses SseService for real-time; polling fallback; SSE reconnect on network restore
- `components/NewOrderAlertModal.tsx` — shows items count, payment method, urgency countdown color change at 8s
- `app/_layout.tsx` — calls detectLocale(), setApiBase() at init and on remote config resolve, renders GpsStatusBanner above Stack
- `app.json` — added ACCESS_BACKGROUND_LOCATION, FOREGROUND_SERVICE, iOS background modes, expo-location plugin with isAndroidBackgroundLocationEnabled/isIosBackgroundLocationEnabled
- `app/order/[id].tsx` — fixed useMemo→useEffect bug (map animation); added queryKey to useGetOrder; removed non-existent restaurantAddress field
- `hooks/usePushNotifications.ts` — fixed expo-notifications ^56 permission API change (any-cast for status/granted)
- `contexts/AuthContext.tsx` — fixed res.driver type assertion (not in AuthResponse type, cast through extended type)

## Key architecture decisions

**Why apiConfig.ts singleton?**
Services (GPS, Heartbeat, SSE) are plain TS modules, not React components — they can't use React context. The singleton is updated by _layout.tsx on remote config resolve and by LocationTrackingContext on auth token change.

**Why isReachable, not isConnected?**
useNetworkStatus returns `{ isReachable, checking, checkNow }` — there is no isConnected field.

**Why Translations interface instead of typeof fr?**
ar.ts and en.ts can't satisfy the exact literal type from `typeof fr` when fr uses `as const`. Fix: define `Translations` interface with `string` values in `i18n/types.ts`.

**expo-localization** — needs explicit install (`pnpm --filter @workspace/livreur add expo-localization`). Not bundled automatically.

**expo-notifications ^56** — NotificationPermissionsStatus shape changed; use any-cast to access `status` or `granted`. Both may or may not be present depending on platform.

**GpsService adaptive frequency** — call `setActiveDelivery(true)` when an order is accepted, `setActiveDelivery(false)` on delivery. This restarts the watcher with the new interval (4s vs 15s).
