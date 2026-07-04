import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { DELIVERY_TIMELINE_STEPS, getTimelineStepIndex } from "@/constants/orderStatus";

interface StatusTimelineProps {
  status: string;
}

export function StatusTimeline({ status }: StatusTimelineProps) {
  const colors = useColors();
  const currentIndex = getTimelineStepIndex(status);
  const isCancelled = status === "cancelled";

  return (
    <View style={styles.container}>
      {DELIVERY_TIMELINE_STEPS.map((step, index) => {
        const done = !isCancelled && index <= currentIndex;
        const isLast = index === DELIVERY_TIMELINE_STEPS.length - 1;
        const dotColor = done ? colors.primary : colors.border;
        return (
          <View key={step.key} style={styles.stepWrapper}>
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: done ? colors.primary : colors.card,
                    borderColor: dotColor,
                  },
                ]}
              >
                <Feather name={step.icon} size={13} color={done ? "#fff" : colors.mutedForeground} />
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: index < currentIndex && !isCancelled ? colors.primary : colors.border },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.label,
                { color: done ? colors.foreground : colors.mutedForeground },
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "flex-start" },
  stepWrapper: { flex: 1, alignItems: "center" },
  stepCol: { flexDirection: "row", alignItems: "center", width: "100%" },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
    marginRight: "auto",
  },
  line: {
    position: "absolute",
    top: 12,
    left: "50%",
    right: "-50%",
    height: 2,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },
});
