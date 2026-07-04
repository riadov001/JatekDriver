import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { WEEKLY_GOAL_PRESETS } from "@/lib/weeklyGoal";

interface WeeklyGoalCardProps {
  goal: number;
  current: number;
  onChangeGoal: (value: number) => void;
}

const MILESTONES = [25, 50, 75, 100];

export function WeeklyGoalCard({ goal, current, onChangeGoal }: WeeklyGoalCardProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [pickerVisible, setPickerVisible] = useState(false);
  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const percent = Math.round(progress * 100);
  const reachedMilestone = [...MILESTONES].reverse().find((m) => percent >= m);
  const goalMet = percent >= 100;

  return (
    <>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Feather name="target" size={16} color={colors.accent} />
            <Text style={[styles.title, { color: colors.foreground }]}>Objectif de la semaine</Text>
          </View>
          <Pressable onPress={() => setPickerVisible(true)} hitSlop={8}>
            <Feather name="edit-3" size={15} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={styles.progressRow}>
          <Text style={[styles.currentValue, { color: colors.foreground }]}>
            {current.toFixed(0)} MAD
          </Text>
          <Text style={[styles.goalValue, { color: colors.mutedForeground }]}>
            / {goal.toFixed(0)} MAD
          </Text>
        </View>

        <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.barFill,
              { backgroundColor: goalMet ? colors.success : colors.accent, width: `${percent}%` },
            ]}
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.percentText, { color: colors.mutedForeground }]}>
            {percent}% atteint
          </Text>
          {goalMet ? (
            <View style={[styles.badge, { backgroundColor: colors.success + "22" }]}>
              <Feather name="award" size={12} color={colors.success} />
              <Text style={[styles.badgeText, { color: colors.success }]}>Objectif atteint !</Text>
            </View>
          ) : reachedMilestone ? (
            <View style={[styles.badge, { backgroundColor: colors.accent + "22" }]}>
              <Feather name="trending-up" size={12} color={colors.accent} />
              <Text style={[styles.badgeText, { color: colors.accent }]}>{reachedMilestone}% étape</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)} />
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choisir un objectif</Text>
          <View style={styles.presetsRow}>
            {WEEKLY_GOAL_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => {
                  onChangeGoal(preset);
                  setPickerVisible(false);
                }}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: preset === goal ? colors.primary : colors.background,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.presetText,
                    { color: preset === goal ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {preset} MAD
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, gap: 10, marginTop: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: "Inter_700Bold", fontSize: 15 },
  progressRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  currentValue: { fontFamily: "Inter_700Bold", fontSize: 22 },
  goalValue: { fontFamily: "Inter_500Medium", fontSize: 14 },
  barTrack: { height: 10, borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 5 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  percentText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 16,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center" },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" },
  presetsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  presetChip: { paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1 },
  presetText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
