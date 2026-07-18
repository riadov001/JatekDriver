/**
 * Lightweight i18n — no external dependency.
 * Supported locales: French (default), Arabic (RTL), English.
 *
 * Usage:
 *   import { t, setLocale, isRTL } from "@/i18n";
 *   t("orders.newOrder")   → "Nouvelle course"
 */

import { getLocales } from "expo-localization";
import fr from "./fr";
import ar from "./ar";
import en from "./en";
import type { Translations } from "./types";

export type Locale = "fr" | "ar" | "en";

const TRANSLATIONS: Record<Locale, Translations> = { fr, ar, en };

let _locale: Locale = "fr";

/** Detect device locale and set accordingly. Called once at app startup. */
export function detectLocale(): void {
  const deviceLocale = getLocales()[0]?.languageCode ?? "fr";
  if (deviceLocale === "ar") {
    _locale = "ar";
  } else if (deviceLocale === "en") {
    _locale = "en";
  } else {
    _locale = "fr";
  }
}

/** Override locale programmatically (e.g. from settings). */
export function setLocale(locale: Locale): void {
  _locale = locale;
}

export function getLocale(): Locale {
  return _locale;
}

/** Returns true when the current locale is RTL (Arabic). */
export function isRTL(): boolean {
  return _locale === "ar";
}

/**
 * Translate a dot-separated key.
 * Example: t("orders.newOrder") → "Nouvelle course"
 */
export function t(key: string): string {
  const dict = TRANSLATIONS[_locale] ?? fr;
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = dict;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return key;
    current = current[part];
  }
  return typeof current === "string" ? current : key;
}

export type { Translations };
