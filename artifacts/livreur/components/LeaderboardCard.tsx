import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface LeaderboardCardProps {
  rank: number;
  totalDrivers: number;
  percentile: number;
  weeklyEarnings: number;
  topWeeklyEarnings: number;
}

export function LeaderboardCard({
  rank,
  totalDrivers,
  percentile,
  weeklyEarnings,
  topWeeklyEarnings,
}: LeaderboardCardProps) {
  const colors = useColors();
  const isTop3 = rank <= 3 && totalDrivers > 3;
  const medalColor = rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : "#CD7F32";

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>Classement hebdo</Text>
        <View
          style={[
            styles.rankBadge,
            { backgroundColor: (isTop3 ? medalColor : colors.primary) + "22" },
          ]}
        >
          <Feather
            name={isTop3 ? "award" : "bar-chart-2"}
            size={13}
            color={isTop3 ? medalColor : colors.primary}
          />
          <Text style={[styles.rankBadgeText, { color: isTop3 ? medalColor : colors.primary }]}>
            #{rank} / {totalDrivers}
          </Text>
        </View>
      </View>

      <Text style={[styles.percentileText, { color: colors.mutedForeground }]}>
        {percentile >= 50
          ? `Vous êtes dans le top ${100 - percentile}% des livreurs cette semaine 🔥`
          : `Continuez, vous progressez cette semaine`}
      </Text>

      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: colors.primary,
              width: `${topWeeklyEarnings > 0 ? Math.min((weeklyEarnings / topWeeklyEarnings) * 100, 100) : 0}%`,
            },
          ]}
        />
      </View>
      <View style={styles.barLabels}>
        <Text style={[styles.barLabelText, { color: colors.foreground }]}>
          {weeklyEarnings.toFixed(0)} MAD
        </Text>
        <Text style={[styles.barLabelText, { color: colors.mutedForeground }]}>
          Top: {topWeeklyEarnings.toFixed(0)} MAD
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, gap: 10, marginTop: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 15 },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  rankBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  percentileText: { fontFamily: "Inter_500Medium", fontSize: 12.5, lineHeight: 17 },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginTop: 2 },
  barFill: { height: "100%", borderRadius: 4 },
  barLabels: { flexDirection: "row", justifyContent: "space-between" },
  barLabelText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
