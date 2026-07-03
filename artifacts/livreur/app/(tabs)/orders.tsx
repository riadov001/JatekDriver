import { Feather } from "@expo/vector-icons";
import {
  getListOrdersQueryKey,
  useListOrders,
  type Order,
  type OrderStatus,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { OrderCard } from "@/components/OrderCard";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type FilterKey = "active" | "delivered" | "all";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "active", label: "Actives" },
  { key: "delivered", label: "Livrées" },
  { key: "all", label: "Toutes" },
];

const ACTIVE_STATUSES: OrderStatus[] = [
  "accepted",
  "preparing",
  "ready",
  "picked_up",
  "en_route",
];

export default function OrdersScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { driverId } = useAuth();
  const [filter, setFilter] = useState<FilterKey>("active");

  const ordersQuery = useListOrders(
    { driverId: driverId ?? undefined },
    {
      query: {
        queryKey: getListOrdersQueryKey({ driverId: driverId ?? undefined }),
        enabled: !!driverId,
        refetchInterval: 8000,
      },
    },
  );

  const filtered: Order[] = useMemo(() => {
    const all = ordersQuery.data ?? [];
    if (filter === "active") return all.filter((o) => ACTIVE_STATUSES.includes(o.status));
    if (filter === "delivered") return all.filter((o) => o.status === "delivered");
    return all;
  }, [ordersQuery.data, filter]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Commandes</Text>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? colors.primaryForeground : colors.mutedForeground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 13,
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 100,
          gap: 12,
        }}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => router.push(`/order/${item.id}`)} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={ordersQuery.isFetching}
            onRefresh={() => ordersQuery.refetch()}
            tintColor={colors.primary}
          />
        }
        scrollEnabled={filtered.length > 0}
        ListEmptyComponent={
          ordersQuery.isError ? (
            <View style={styles.errorState}>
              <Feather name="alert-triangle" size={28} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.foreground }]}>
                Impossible de charger les commandes
              </Text>
              <Pressable
                onPress={() => ordersQuery.refetch()}
                style={[
                  styles.retryBtn,
                  { backgroundColor: colors.primary, borderRadius: colors.radius },
                ]}
              >
                <Text
                  style={{
                    color: colors.primaryForeground,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  Réessayer
                </Text>
              </Pressable>
            </View>
          ) : (
            <EmptyState
              icon="inbox"
              title={
                filter === "active"
                  ? "Aucune course en cours"
                  : filter === "delivered"
                    ? "Aucune livraison terminée"
                    : "Aucune commande"
              }
              description="Tirez vers le bas pour actualiser."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  errorState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 60,
  },
  errorText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
