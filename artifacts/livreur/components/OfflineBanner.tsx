import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/**
 * Persistent top banner shown whenever the app can't reach the backend
 * (e.g. `https://ma.jatek.app` is unreachable). Prevents the driver from
 * silently going offline / losing tracking without knowing why.
 */
export function OfflineBanner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isReachable, checking, checkNow } = useNetworkStatus();

  if (isReachable) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={[styles.banner, { backgroundColor: colors.destructive }]}>
        <Feather name="wifi-off" size={16} color="#fff" />
        <Text style={styles.text} numberOfLines={2}>
          Connexion au serveur perdue. Vérifiez votre réseau.
        </Text>
        <Pressable
          onPress={checkNow}
          disabled={checking}
          style={({ pressed }) => [styles.retryBtn, { opacity: pressed || checking ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Réessayer la connexion"
        >
          <Text style={styles.retryText}>{checking ? "..." : "Réessayer"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: {
    flex: 1,
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  retryText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
