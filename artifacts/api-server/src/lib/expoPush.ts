/**
 * Expo Push Notification service.
 *
 * All push notifications for the Jatek platform pass through this module.
 * The backend (ma.jatek.app) calls the Expo Push API directly — no client
 * should ever talk to the Expo Push API itself.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  priority?: "normal" | "high";
  channelId?: string;
}

function isValidExpoToken(token: unknown): token is string {
  return (
    typeof token === "string" &&
    (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["))
  );
}

/**
 * Send one or more Expo push messages.
 * - Silently filters out any invalid / non-Expo tokens.
 * - Batches at most 100 messages per HTTP request (Expo limit).
 * - Never throws — errors are logged but swallowed so a push failure never
 *   blocks the business logic that triggered it.
 */
export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  const valid = messages.filter((m) => isValidExpoToken(m.to));
  if (valid.length === 0) return;

  for (let i = 0; i < valid.length; i += 100) {
    const batch = valid.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[expoPush] Expo API error:", res.status, text);
      }
    } catch (e) {
      console.error("[expoPush] fetch failed:", e);
    }
  }
}
