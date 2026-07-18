/**
 * NewOrderAlertModal — displayed when a new delivery is available.
 *
 * Shows all the information the driver needs to make a decision:
 *   • Restaurant name
 *   • Delivery address
 *   • Item count
 *   • Total order amount
 *   • Estimated driver earnings
 *   • Payment method
 *   • Countdown bar + seconds remaining
 *
 * The driver has ALERT_COUNTDOWN_SECONDS to accept or decline.
 * On timeout, the order is auto-declined (onExpire).
 */

import { Feather } from "@expo/vector-icons";
import type { Order } from "@workspace/api-client-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
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

function paymentLabel(method?: string | null): string {
  switch (method) {
    case "cash":    return "Espèces";
    case "card":    return "Carte";
    case "online":  return "En ligne";
    default:        return method ?? "—";
  }
}

export const NewOrderAlertModal = memo(function NewOrderAlertModal({
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

  // Reset + start countdown each time the modal becomes visible.
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

  const handleDecline = useCallback(() => {
    if (!accepting) onDecline();
  }, [accepting, onDecline]);

  if (!order) return null;

  const progress = secondsLeft / countdownSeconds;
  // Estimated gain: 80% of delivery fee, or fallback to 15% of total.
  const estimatedGain = order.deliveryFee
    ? (order.deliveryFee * 0.8).toFixed(2)
    : (order.total * 0.15).toFixed(2);

  const orderAny = order as unknown as Record<string, unknown>;
  const itemCount = Array.isArray(orderAny.items) ? (orderAny.items as unknown[]).length : null;
  const paymentMethod = typeof orderAny.paymentMethod === "string" ? orderAny.paymentMethod : null;
  const isUrgent = secondsLeft <= 8;

  const countdownColor = isUrgent ? colors.destructive : colors.accent;

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
          {/* ── Countdown bar ── */}
          <View style={styles.countdownRow}>
            <View style={[styles.countdownTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.countdownFill,
                  {
                    backgroundColor: countdownColor,
                    width: `${Math.max(progress, 0) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.countdownText, { color: countdownColor }]}>
              {secondsLeft}s
            </Text>
          </View>

          {/* ── Header ── */}
          <View style={styles.headerRow}>
            <View style={[styles.pulseIcon, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="zap" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Nouvelle course !
              </Text>
              {itemCount != null && (
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  {itemCount} article{itemCount !== 1 ? "s" : ""}
                </Text>
              )}
            </View>
          </View>

          {/* ── Order info card ── */}
          <View style={[styles.infoCard, { backgroundColor: colors.background, borderRadius: colors.radius }]}>
            {/* Restaurant */}
            <View style={styles.row}>
              <Feather name="home" size={14} color={colors.primary} />
              <Text style={[styles.restaurantName, { color: colors.foreground }]} numberOfLines={1}>
                {order.restaurantName}
              </Text>
            </View>

            {/* Delivery address */}
            <View style={styles.row}>
              <Feather name="map-pin" size={14} color={colors.accent} />
              <Text style={[styles.rowText, { color: colors.mutedForeground }]} numberOfLines={2}>
                {order.deliveryAddress}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Metrics row */}
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
                  Total commande
                </Text>
                <Text style={[styles.metricValue, { color: colors.foreground }]}>
                  {order.total.toFixed(2)} MAD
                </Text>
              </View>

              <View style={styles.metric}>
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
                  Votre gain
                </Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  +{estimatedGain} MAD
                </Text>
              </View>

              {paymentMethod && (
                <View style={styles.metric}>
                  <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
                    Paiement
                  </Text>
                  <Text style={[styles.metricValue, { color: colors.foreground, fontSize: 14 }]}>
                    {paymentLabel(paymentMethod)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Actions ── */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleDecline}
              disabled={accepting}
              accessibilityLabel="Refuser la course"
              style={[
                styles.declineBtn,
                {
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  opacity: accepting ? 0.5 : 1,
                },
              ]}
            >
              <Feather name="x" size={20} color={colors.mutedForeground} />
              <Text style={[styles.declineText, { color: colors.mutedForeground }]}>
                Refuser
              </Text>
            </Pressable>

            <Pressable
              onPress={onAccept}
              disabled={accepting}
              accessibilityLabel="Accepter la course"
              style={[
                styles.acceptBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  opacity: accepting ? 0.85 : 1,
                },
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
});

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
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  countdownTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  countdownFill: {
    height: "100%",
    borderRadius: 3,
  },
  countdownText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    minWidth: 32,
    textAlign: "right",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pulseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  infoCard: {
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  restaurantName: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    flex: 1,
  },
  rowText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  divider: {
    height: 1,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  metric: {
    minWidth: 80,
  },
  metricLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metricValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderWidth: 1.5,
    minHeight: 56,
  },
  declineText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  acceptBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    minHeight: 56,
  },
  acceptText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
});
