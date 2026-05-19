import { Feather } from "@expo/vector-icons";
import {
  useAcceptOrderDelivery,
  getGetAvailableOrdersQueryKey,
  getListOrdersQueryKey,
  type Order,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface AvailableOrderCardProps {
  order: Order;
  driverId: number;
}

export function AvailableOrderCard({ order, driverId }: AvailableOrderCardProps) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);

  const acceptMutation = useAcceptOrderDelivery({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAvailableOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ driverId }) });
      },
      onError: (err: unknown) => {
        const msg =
          (err as { data?: { error?: string } })?.data?.error ??
          "Impossible d'accepter la commande";
        Alert.alert("Erreur", msg);
      },
    },
  });

  const handleAccept = async () => {
    if (accepting) return;
    setAccepting(true);
    try {
      await acceptMutation.mutateAsync({ id: order.id, data: { driverId } });
      await Promise.all([
        queryClient.refetchQueries({ queryKey: getListOrdersQueryKey({ driverId }) }),
        queryClient.invalidateQueries({ queryKey: getGetAvailableOrdersQueryKey() }),
      ]);
      router.push(`/order/${order.id}`);
    } catch {
      // error handled in onError
    } finally {
      setAccepting(false);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.accent,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.reference, { color: colors.mutedForeground }]}>
          #{order.reference ?? order.id}
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.accent + "22" }]}>
          <View style={[styles.badgeDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.badgeText, { color: colors.accent }]}>Disponible</Text>
        </View>
      </View>

      <Text style={[styles.restaurant, { color: colors.foreground }]} numberOfLines={1}>
        {order.restaurantName}
      </Text>

      <View style={styles.routeRow}>
        <Feather name="map-pin" size={14} color={colors.primary} />
        <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={2}>
          {order.deliveryAddress}
        </Text>
      </View>

      <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.total, { color: colors.foreground }]}>
            {order.total.toFixed(2)} MAD
          </Text>
          <Text style={[styles.fee, { color: colors.success }]}>
            +{((order.deliveryFee ?? 0) * 0.8).toFixed(2)} MAD gain
          </Text>
        </View>
        <Pressable
          onPress={handleAccept}
          disabled={accepting}
          style={[
            styles.acceptBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              opacity: accepting ? 0.7 : 1,
            },
          ]}
        >
          {accepting ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.acceptText, { color: colors.primaryForeground }]}>
              Accepter
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 2,
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
  total: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  fee: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  acceptBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: "center",
  },
  acceptText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});
