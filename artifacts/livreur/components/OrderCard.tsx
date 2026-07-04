import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { STATUS_LABELS } from "@/constants/orderStatus";
import type { Order } from "@workspace/api-client-react";

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

function statusColor(status: string, colors: ReturnType<typeof useColors>): string {
  switch (status) {
    case "delivered":
      return colors.success;
    case "cancelled":
      return colors.destructive;
    case "en_route":
    case "picked_up":
      return colors.primary;
    case "ready":
      return colors.accent;
    default:
      return colors.warning;
  }
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const colors = useColors();
  const sColor = statusColor(order.status, colors);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.reference, { color: colors.mutedForeground }]}>
          #{order.reference ?? order.id}
        </Text>
        <View style={[styles.badge, { backgroundColor: sColor + "22" }]}>
          <View style={[styles.badgeDot, { backgroundColor: sColor }]} />
          <Text style={[styles.badgeText, { color: sColor }]}>
            {STATUS_LABELS[order.status] ?? order.status}
          </Text>
        </View>
      </View>

      <Text style={[styles.restaurant, { color: colors.foreground }]} numberOfLines={1}>
        {order.restaurantName}
      </Text>

      <View style={styles.routeRow}>
        <Feather name="package" size={14} color={colors.mutedForeground} />
        <Text style={[styles.routeText, { color: colors.mutedForeground }]} numberOfLines={1}>
          {order.userName}
        </Text>
      </View>
      <View style={styles.routeRow}>
        <Feather name="map-pin" size={14} color={colors.primary} />
        <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={2}>
          {order.deliveryAddress}
        </Text>
      </View>

      <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>Total</Text>
        <Text style={[styles.footerValue, { color: colors.foreground }]}>
          {order.total.toFixed(2)} MAD
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reference: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  restaurant: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  footerLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  footerValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
});
