/**
 * GpsStatusBanner — displays GPS state when it is not AVAILABLE.
 *
 * AVAILABLE → invisible (no banner rendered)
 * All other states → a non-blocking info strip at the top of the screen.
 *
 * Usage:
 *   <GpsStatusBanner />   (reads from LocationTrackingContext)
 */

import { Feather } from "@expo/vector-icons";
import { memo } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useLocationTracking } from "@/contexts/LocationTrackingContext";
import { useColors } from "@/hooks/useColors";
import type { GpsState } from "@/services/gps/types";

interface StateConfig {
  icon: React.ComponentProps<typeof Feather>["name"];
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  severity: "info" | "warning" | "error";
}

function useStateConfig(gpsState: GpsState): StateConfig | null {
  switch (gpsState) {
    case "AVAILABLE":
      return null; // no banner
    case "SEARCHING":
      return { icon: "radio", message: "Recherche du signal GPS…", severity: "info" };
    case "LOW_ACCURACY":
      return { icon: "alert-circle", message: "Précision GPS faible — restez à découvert.", severity: "warning" };
    case "TEMPORARILY_UNAVAILABLE":
      return { icon: "wifi-off", message: "GPS temporairement indisponible.", severity: "warning" };
    case "DISABLED":
      return {
        icon: "map-pin",
        message: "GPS désactivé. Activez-le pour continuer.",
        actionLabel: "Paramètres",
        onAction: () => {
          if (Platform.OS !== "web") Linking.openSettings().catch(() => {});
        },
        severity: "error",
      };
    case "PERMISSION_DENIED":
      return {
        icon: "lock",
        message: "Accès à la localisation refusé.",
        actionLabel: "Paramètres",
        onAction: () => {
          if (Platform.OS !== "web") Linking.openSettings().catch(() => {});
        },
        severity: "error",
      };
    default:
      return null;
  }
}

export const GpsStatusBanner = memo(function GpsStatusBanner() {
  const colors = useColors();
  const { gpsState, online } = useLocationTracking();

  const config = useStateConfig(gpsState);

  // Only show the banner when the driver is online (offline = expected, not an error).
  if (!config || !online) return null;

  const bgColor =
    config.severity === "error"
      ? colors.destructive + "1A"
      : config.severity === "warning"
        ? colors.warning + "1A"
        : colors.primary + "1A";

  const textColor =
    config.severity === "error"
      ? colors.destructive
      : config.severity === "warning"
        ? colors.warning
        : colors.primary;

  return (
    <View style={[styles.banner, { backgroundColor: bgColor, borderBottomColor: textColor + "33" }]}>
      <Feather name={config.icon} size={13} color={textColor} />
      <Text style={[styles.message, { color: textColor }]} numberOfLines={1}>
        {config.message}
      </Text>
      {config.actionLabel && config.onAction && (
        <Pressable onPress={config.onAction} style={styles.action} accessibilityRole="button">
          <Text style={[styles.actionText, { color: textColor }]}>{config.actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 7,
    gap: 6,
    borderBottomWidth: 1,
  },
  message: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  action: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  actionText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
