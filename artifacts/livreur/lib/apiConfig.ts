/**
 * apiConfig — single source of truth for the resolved API base URL.
 *
 * The _layout.tsx resolves the URL async (remote config) and writes it here.
 * Services (GPS, Heartbeat, SSE) read it via getApiBase() so they never
 * need to pass the URL through every call chain.
 */

let _base =
  (
    process.env.EXPO_PUBLIC_BACKEND_BASE_URL_API ||
    process.env.EXPO_PUBLIC_API_URL ||
    (process.env.EXPO_PUBLIC_API_DOMAIN
      ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
      : "")
  )
    .replace(/\/api\/?$/, "")
    .replace(/\/+$/, "") || "https://ma.jatek.app";

let _token: string | null = null;

export function setApiBase(url: string): void {
  _base = url.replace(/\/+$/, "");
}

export function getApiBase(): string {
  return _base;
}

export function setServiceToken(token: string | null): void {
  _token = token;
}

export function getServiceToken(): string | null {
  return _token;
}
