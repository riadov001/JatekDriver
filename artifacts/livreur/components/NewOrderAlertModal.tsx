import { Feather } from "@expo/vector-icons";
import type { Order } from "@workspace/api-client-react";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface NewOrderAlertModalProps {
  order: Order | null;
  visible: boolean;
  countdownSeconds: number;
  accepting: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onExpire: () => void;
}

export function NewOrderAlertModal({
  order,
  visible,
  countdownSeconds,
  accepting,
  onAccept,
  onDecline,
  onExpire,
}: NewOrderAlertModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!visible) return;
    setSecondsLeft(countdownSeconds);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          onExpireRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, countdownSeconds]);

  if (!order) return null;

  const progress = secondsLeft / countdownSeconds;
  const estimatedGain = ((order.deliveryFee ?? 0) * 0.8).toFixed(2);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 20,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
            },
          ]}
        >
          <View style={styles.countdownRow}>
            <View style={[styles.countdownTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.countdownFill,
                  { backgroundColor: colors.accent, width: `${Math.max(progress, 0) * 100}%` },
                ]}
              />
            </View>
            <Text style={[styles.countdownText, { color: colors.mutedForeground }]}>
              {secondsLeft}s
            </Text>
          </View>

          <View style={styles.headerRow}>
            <View style={[styles.pulseIcon, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="zap" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Nouvelle course !</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.background, borderRadius: colors.radius }]}>
            <Text style={[styles.restaurant, { color: colors.foreground }]} numberOfLines={1}>
              {order.restaurantName}
            </Text>
            <View style={styles.row}>
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={[styles.rowText, { color: colors.mutedForeground }]} numberOfLines={2}>
                {order.deliveryAddress}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.metricsRow}>
              <View>
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>Total commande</Text>
                <Text style={[styles.metricValue, { color: colors.foreground }]}>
                  {order.total.toFixed(2)} MAD
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>Votre gain</Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>+{estimatedGain} MAD</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={onDecline}
              disabled={accepting}
              style={[
                styles.declineBtn,
                { borderColor: colors.border, borderRadius: colors.radius, opacity: accepting ? 0.6 : 1 },
              ]}
            >
              <Feather name="x" size={20} color={colors.mutedForeground} />
              <Text style={[styles.declineText, { color: colors.mutedForeground }]}>Ignorer</Text>
            </Pressable>
            <Pressable
              onPress={onAccept}
              disabled={accepting}
              style={[
                styles.acceptBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: accepting ? 0.85 : 1 },
              ]}
            >
              {accepting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={20} color="#fff" />
                  <Text style={styles.acceptText}>Accepter</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: Platform.OS === "android" ? 12 : 0,
  },
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  countdownTrack: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  countdownFill: { height: "100%", borderRadius: 3 },
  countdownText: { fontFamily: "Inter_700Bold", fontSize: 13, minWidth: 30, textAlign: "right" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pulseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.5 },
  infoCard: { padding: 16, gap: 8 },
  restaurant: { fontFamily: "Inter_700Bold", fontSize: 17 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  rowText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  divider: { height: 1, marginVertical: 4 },
  metricsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  metricLabel: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  metricValue: { fontFamily: "Inter_700Bold", fontSize: 20, marginTop: 2 },
  actionsRow: { flexDirection: "row", gap: 12 },
  declineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderWidth: 1.5,
  },
  declineText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  acceptBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  acceptText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});
