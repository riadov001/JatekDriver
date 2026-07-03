import {
  getGetDriverEarningsQueryKey,
  getGetAvailableOrdersQueryKey,
  getListOrdersQueryKey,
  useGetDriverEarnings,
  useGetAvailableOrders,
  useListOrders,
  type Order,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvailableOrderCard } from "@/components/AvailableOrderCard";
import { EmptyState } from "@/components/EmptyState";
import { GoOnlineButton } from "@/components/GoOnlineButton";
import { Logo } from "@/components/Logo";
import { OrderCard } from "@/components/OrderCard";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationTracking } from "@/contexts/LocationTrackingContext";
import { useColors } from "@/hooks/useColors";

const ACTIVE_STATUSES = new Set(["accepted", "preparing", "ready", "picked_up", "en_route"]);

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { driver, driverId, user } = useAuth();
  const { online, toggling, permissionDenied, setOnline } = useLocationTracking();

  const earningsQuery = useGetDriverEarnings(driverId ?? 0, {
    query: {
      queryKey: getGetDriverEarningsQueryKey(driverId ?? 0),
      enabled: !!driverId,
    },
  });

  const ordersQuery = useListOrders(
    { driverId: driverId ?? undefined },
    {
      query: {
        queryKey: getListOrdersQueryKey({ driverId: driverId ?? undefined }),
        enabled: !!driverId,
        refetchInterval: online ? 15000 : 60000,
      },
    },
  );

  const availableQuery = useGetAvailableOrders({
    query: {
      queryKey: getGetAvailableOrdersQueryKey(),
      enabled: online && !!driverId,
      refetchInterval: online ? 10000 : false,
    },
  });

  const onRefresh = useCallback(() => {
    earningsQuery.refetch();
    ordersQuery.refetch();
    if (online) availableQuery.refetch();
  }, [earningsQuery, ordersQuery, availableQuery, online]);

  const activeOrders: Order[] = (ordersQuery.data ?? []).filter((o: Order) =>
    ACTIVE_STATUSES.has(o.status),
  );

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const tabBarSpace = 100;
  const refreshing = earningsQuery.isFetching || ordersQuery.isFetching;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + webTopInset + 8,
        paddingBottom: insets.bottom + tabBarSpace,
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.headerRow}>
        <Logo size="md" />
      </View>
      <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Bonjour</Text>
      <Text style={[styles.name, { color: colors.foreground }]}>
        {driver?.name ?? user?.name ?? "Livreur"}
      </Text>

      <View style={styles.section}>
        <GoOnlineButton
          online={online}
          toggling={toggling}
          permissionDenied={permissionDenied}
          onToggle={setOnline}
        />
      </View>

      {driver && !driver.profileCompletedAt && (
        <Pressable
          onPress={() => router.push("/complete-profile")}
          style={[
            styles.profileBanner,
            { backgroundColor: colors.warning + "22", borderColor: colors.warning, borderRadius: colors.radius },
          ]}
        >
          <Feather name="alert-triangle" size={18} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.foreground }]}>
              Profil incomplet
            </Text>
            <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>
              Complétez votre profil pour accepter des livraisons
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
      )}

      <View style={styles.statsRow}>
        <StatCard
          label="Aujourd'hui"
          value={`${(earningsQuery.data?.today ?? 0).toFixed(2)} MAD`}
          icon="dollar-sign"
          accentColor={colors.success}
          subtitle="Gains du jour"
        />
        <StatCard
          label="Livraisons"
          value={String(earningsQuery.data?.completedToday ?? 0)}
          icon="package"
          accentColor={colors.accent}
          subtitle="Aujourd'hui"
        />
      </View>

      {online && (availableQuery.data?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Courses disponibles
            </Text>
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                {availableQuery.data?.length}
              </Text>
            </View>
          </View>
          <View style={{ gap: 12 }}>
            {(availableQuery.data ?? []).map((o: Order) => (
              <AvailableOrderCard key={o.id} order={o} driverId={driverId!} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Courses actives</Text>
          {activeOrders.length > 0 ? (
            <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
              {activeOrders.length}
            </Text>
          ) : null}
        </View>

        {ordersQuery.isLoading ? (
          <View style={[styles.skeleton, { backgroundColor: colors.card, borderRadius: colors.radius }]} />
        ) : activeOrders.length === 0 ? (
          <EmptyState
            icon="package"
            title="Aucune course active"
            description={
              online
                ? "Vous recevrez les nouvelles courses ici dès qu'elles seront assignées."
                : "Passez en ligne pour commencer à recevoir des courses."
            }
          />
        ) : (
          <View style={{ gap: 12 }}>
            {activeOrders.slice(0, 4).map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onPress={() => router.push(`/order/${o.id}`)}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  greeting: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 4 },
  name: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: -0.5, marginBottom: 16 },
  section: { marginTop: 20 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  sectionCount: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  skeleton: { height: 140, opacity: 0.6 },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  profileBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
    marginTop: 16,
  },
  bannerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  bannerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
});
