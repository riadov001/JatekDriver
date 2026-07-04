import { Feather } from "@expo/vector-icons";
import {
  getGetDriverEarningsQueryKey,
  getGetDriverLeaderboardQueryKey,
  useGetDriverEarnings,
  useGetDriverLeaderboard,
} from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeaderboardCard } from "@/components/LeaderboardCard";
import { StatCard } from "@/components/StatCard";
import { WeeklyGoalCard } from "@/components/WeeklyGoalCard";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getWeeklyGoal, setWeeklyGoal as persistWeeklyGoal } from "@/lib/weeklyGoal";

function formatMad(v: number | undefined): string {
  return `${(v ?? 0).toFixed(2)} MAD`;
}

export default function EarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { driverId } = useAuth();
  const [weeklyGoal, setWeeklyGoalState] = useState<number | null>(null);

  useEffect(() => {
    getWeeklyGoal().then(setWeeklyGoalState);
  }, []);

  const handleChangeGoal = (value: number) => {
    setWeeklyGoalState(value);
    persistWeeklyGoal(value);
  };

  const earningsQuery = useGetDriverEarnings(driverId ?? 0, {
    query: {
      queryKey: getGetDriverEarningsQueryKey(driverId ?? 0),
      enabled: !!driverId,
    },
  });

  const leaderboardQuery = useGetDriverLeaderboard(driverId ?? 0, {
    query: {
      queryKey: getGetDriverLeaderboardQueryKey(driverId ?? 0),
      enabled: !!driverId,
    },
  });

  const data = earningsQuery.data;
  const leaderboard = leaderboardQuery.data;
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + webTopInset + 12,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl
          refreshing={earningsQuery.isFetching}
          onRefresh={() => earningsQuery.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Mes gains</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Aperçu de vos revenus
      </Text>

      <View
        style={[
          styles.heroCard,
          { backgroundColor: colors.primary, borderRadius: colors.radius },
        ]}
      >
        <Text style={[styles.heroLabel, { color: colors.primaryForeground }]}>
          Solde total
        </Text>
        <Text style={[styles.heroValue, { color: colors.primaryForeground }]}>
          {formatMad(data?.totalEarnings)}
        </Text>
        <View style={styles.heroFooter}>
          <View style={styles.heroFooterItem}>
            <Feather name="package" size={14} color={colors.primaryForeground} />
            <Text style={[styles.heroFooterText, { color: colors.primaryForeground }]}>
              {data?.totalDeliveries ?? 0} livraisons
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsCol}>
        <View style={styles.row}>
          <StatCard
            label="Aujourd'hui"
            value={formatMad(data?.today)}
            icon="sun"
            accentColor={colors.success}
          />
          <StatCard
            label="Cette semaine"
            value={formatMad(data?.thisWeek)}
            icon="calendar"
            accentColor={colors.accent}
          />
        </View>
        <View style={styles.row}>
          <StatCard
            label="Ce mois"
            value={formatMad(data?.thisMonth)}
            icon="trending-up"
            accentColor={colors.secondary}
          />
          <StatCard
            label="Courses"
            value={String(data?.completedToday ?? 0)}
            icon="check-circle"
            accentColor={colors.primary}
            subtitle="Aujourd'hui"
          />
        </View>
      </View>

      {weeklyGoal !== null && (
        <WeeklyGoalCard
          goal={weeklyGoal}
          current={data?.thisWeek ?? 0}
          onChangeGoal={handleChangeGoal}
        />
      )}

      {leaderboard && (
        <LeaderboardCard
          rank={leaderboard.rank}
          totalDrivers={leaderboard.totalDrivers}
          percentile={leaderboard.percentile}
          weeklyEarnings={leaderboard.weeklyEarnings}
          topWeeklyEarnings={leaderboard.topWeeklyEarnings}
        />
      )}

      <View
        style={[
          styles.infoCard,
          { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
        ]}
      >
        <Feather name="info" size={18} color={colors.mutedForeground} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Les gains sont mis à jour à chaque livraison terminée. Les paiements sont
          versés chaque semaine.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: "Inter_700Bold", fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 4 },
  heroCard: {
    marginTop: 20,
    padding: 24,
    gap: 8,
  },
  heroLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    opacity: 0.85,
  },
  heroValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 40,
    letterSpacing: -1,
  },
  heroFooter: { flexDirection: "row", gap: 16, marginTop: 8 },
  heroFooterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroFooterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  statsCol: { marginTop: 16, gap: 12 },
  row: { flexDirection: "row", gap: 12 },
  infoCard: {
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
});
