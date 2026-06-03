---
name: Push notification architecture
description: How Jatek push notifications are wired — backend triggers, token storage, and client setup.
---

## Rule
All push notifications pass through the backend (ma.jatek.app). No client calls the Expo Push API directly.

**Why:** User requirement; single choke-point for rate-limiting, logging, and future vendor swap.

## How to apply

### Token storage
- `usersTable.pushToken` (text, nullable) — single source of truth for both drivers and customers.
- Drivers register via `PUT /api/push-token` in `usePushNotifications` hook (called on every auth in `_layout.tsx`).

### Sending pushes (backend)
- `artifacts/api-server/src/lib/expoPush.ts` — `sendExpoPush(messages[])` — batches 100/req, validates tokens, never throws.
- `pushNotification(userId, type, title, body, data?)` in `notifications.ts` — inserts DB row AND sends Expo push in one call. Use this for per-user notifications.
- For broadcast (e.g. all available drivers when order is ready): use `notifyAvailableDrivers()` helper in `orders.ts` which joins drivers+users tables and calls `sendExpoPush` directly.

### Order events wired
| Event | Push recipient |
|-------|---------------|
| Order created | customer (received) + restaurant owner (new order) |
| accepted | customer |
| preparing | customer |
| ready | all available drivers (broadcast) |
| driver assigned | assigned driver |
| picked_up / accept-delivery | customer |
| delivered | customer + driver (earnings) |
| cancelled | customer |

### Admin dashboard (web)
- `useAdminNotifications` hook in `App.tsx` — subscribes to `admin_tracking` SSE channel + browser Notification API.
- SSE auth: `?token=<localStorage.jatek_backend_token>` query param (same pattern as LiveTrackingMap.tsx).

### Mobile (livreur)
- `expo-notifications` installed; plugin added to `app.json` with green icon color.
- EAS project ID: `3bf3e2da-2317-4261-b2a4-d0a62426be7e` — required for `getExpoPushTokenAsync`.
- `usePushNotifications` hook: requests permission, gets token, calls `PUT /api/push-token`, handles tap→navigate to order screen.
