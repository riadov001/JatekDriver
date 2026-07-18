/**
 * Best-effort WhatsApp / SMS notification layer.
 *
 * Reuses the existing Infobip → Twilio fallback chain from otpMessaging.ts.
 * Never throws — all failures are logged silently so a messaging glitch
 * never breaks the calling request.
 *
 * Moroccan phone numbers must be in E.164 format: +212XXXXXXXXX
 */

import { sendOtpMessage } from "./otpMessaging";

/**
 * Send a free-text WhatsApp or SMS message to a phone number.
 * Provider priority: Infobip SMS → Twilio SMS → Infobip WA → Twilio WA.
 */
export async function sendWaNotification(to: string | null | undefined, body: string): Promise<void> {
  if (!to) return;
  // Normalise Moroccan numbers: 06... / 07... → +2126... / +2127...
  const e164 = normalisePhone(to);
  if (!e164) return;
  try {
    await sendOtpMessage(e164, body);
  } catch (e) {
    // Silent — push notification already went through in-app; WA is bonus.
    console.warn("[wa-notify] failed:", (e as Error).message?.slice(0, 120));
  }
}

function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("212") && digits.length === 12) return `+${digits}`;
  if ((digits.startsWith("06") || digits.startsWith("07")) && digits.length === 10) {
    return `+212${digits.slice(1)}`;
  }
  if (digits.startsWith("6") || digits.startsWith("7") && digits.length === 9) {
    return `+212${digits}`;
  }
  // Already E.164 or international — pass through as-is
  if (raw.startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}

// ── Pre-composed order status messages (French + darija-friendly) ─────────────

export const WA_MESSAGES = {
  accepted: (ref: string, restaurant: string) =>
    `✅ *Jatek* — Commande ${ref} acceptée par ${restaurant} ! Votre repas est en cours de préparation. 🍽️`,

  preparing: (ref: string, restaurant: string) =>
    `👨‍🍳 *Jatek* — ${restaurant} prépare votre commande ${ref}. Votre livreur sera bientôt en route !`,

  ready: (ref: string) =>
    `📦 *Jatek* — Commande ${ref} prête ! Un livreur arrive pour la récupérer.`,

  enRoute: (ref: string, driverName: string) =>
    `🛵 *Jatek* — ${driverName} est en route avec votre commande ${ref}. Préparez-vous à accueillir votre repas !`,

  delivered: (ref: string) =>
    `🎉 *Jatek* — Commande ${ref} livrée ! Bon appétit 🍴\nMerci de noter votre expérience dans l\'application.`,

  cancelled: (ref: string, reason?: string) =>
    `❌ *Jatek* — Votre commande ${ref} a été annulée.${reason ? `\nMotif : ${reason}` : ""}\nBesoin d\'aide ? Contactez notre support dans l\'app.`,

  /** Anonymous relay: driver → customer */
  driverRelay: (message: string) =>
    `🛵 *Votre livreur Jatek* :\n« ${message} »\n\n_(Ce message est envoyé de façon anonyme via la plateforme Jatek)_`,
} as const;
