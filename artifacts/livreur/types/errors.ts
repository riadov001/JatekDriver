/**
 * Centralized error taxonomy — every network/GPS/auth failure maps to one
 * of these categories so screens can show a relevant, actionable message.
 */

export type AppErrorCategory =
  | "VALIDATION"
  | "NETWORK"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "TIMEOUT"
  | "GPS"
  | "UNKNOWN";

export class AppError extends Error {
  readonly category: AppErrorCategory;
  readonly retryable: boolean;
  readonly cause: unknown;

  constructor(
    category: AppErrorCategory,
    message: string,
    cause?: unknown,
    retryable = false,
  ) {
    super(message);
    this.name = "AppError";
    this.category = category;
    this.retryable = retryable;
    this.cause = cause;
  }
}

export function categorizeError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("401") || lower.includes("unauthorized")) {
    return new AppError("AUTHENTICATION", "Session expirée. Reconnectez-vous.", err, false);
  }
  if (lower.includes("403") || lower.includes("forbidden")) {
    return new AppError("AUTHORIZATION", "Accès refusé.", err, false);
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return new AppError("TIMEOUT", "Délai dépassé. Vérifiez votre connexion.", err, true);
  }
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("connection") ||
    lower.includes("offline")
  ) {
    return new AppError("NETWORK", "Connexion indisponible.", err, true);
  }

  return new AppError("UNKNOWN", "Une erreur inattendue est survenue.", err, true);
}

/** Human-readable label for each error category (French) */
export const ERROR_LABELS: Record<AppErrorCategory, string> = {
  VALIDATION: "Données invalides",
  NETWORK: "Connexion indisponible",
  AUTHENTICATION: "Session expirée",
  AUTHORIZATION: "Accès refusé",
  TIMEOUT: "Délai dépassé",
  GPS: "GPS indisponible",
  UNKNOWN: "Erreur inattendue",
};
