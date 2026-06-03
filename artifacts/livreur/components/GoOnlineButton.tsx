import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface GoOnlineButtonProps {
  online: boolean;
  toggling: boolean;
  permissionDenied: boolean;
  onToggle: (next: boolean) => void;
}

export function GoOnlineButton({
  online,
  toggling,
  permissionDenied,
  onToggle,
}: GoOnlineButtonProps) {
  const colors = useColors();

  const handlePress = () => {
    if (toggling) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onToggle(!online);
  };

  const bgColor = online ? "#DC2626" : colors.primary;
  const fgColor = "#FFFFFF";

  return (
    <Pressable
      onPress={handlePress}
      disabled={toggling}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bgColor,
          borderRadius: colors.radius,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.inner}>
        {toggling ? (
          <ActivityIndicator color={fgColor} size="large" />
        ) : (
          <View style={styles.iconCircle}>
            <Feather
              name={online ? "wifi-off" : "radio"}
              size={28}
              color={fgColor}
            />
          </View>
        )}
        <Text style={[styles.label, { color: fgColor }]}>
          {toggling
            ? "Chargement…"
            : online
              ? "Passer hors ligne"
              : "Passer en ligne"}
        </Text>
        <Text style={[styles.sub, { color: fgColor + "CC" }]}>
          {permissionDenied
            ? "Autorisation GPS requise"
            : online
              ? "Vous recevez des courses — appuyez pour arrêter"
              : "Appuyez pour commencer à recevoir des courses"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  inner: {
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  label: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    maxWidth: 260,
  },
});
