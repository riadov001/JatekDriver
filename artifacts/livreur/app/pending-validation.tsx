import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/components/Logo";
import { useColors } from "@/hooks/useColors";

export default function PendingValidationScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + webTopInset,
          paddingBottom: insets.bottom + 32,
        },
      ]}
    >
      <View style={styles.inner}>
        <Logo size="lg" />

        <View style={[styles.iconWrap, { backgroundColor: colors.warning + "20" }]}>
          <Feather name="clock" size={48} color={colors.warning} />
        </View>

        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Compte en attente
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Votre inscription a bien été reçue. Un administrateur va examiner et valider votre compte dans les plus brefs délais.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Step
            icon="user-check"
            label="Inscription soumise"
            done
            colors={colors}
          />
          <View style={[styles.stepDivider, { backgroundColor: colors.border }]} />
          <Step
            icon="shield"
            label="Validation par l'administrateur"
            pending
            colors={colors}
          />
          <View style={[styles.stepDivider, { backgroundColor: colors.border }]} />
          <Step
            icon="package"
            label="Accès à l'application"
            colors={colors}
          />
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          <Feather name="mail" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Vous serez notifié par email dès que votre compte sera activé. Revenez vous connecter ensuite.
          </Text>
        </View>

        <Pressable
          onPress={() => router.replace("/login")}
          style={({ pressed }) => [
            styles.btn,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="log-in" size={18} color={colors.primaryForeground} />
          <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
            Retour à la connexion
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Step({
  icon,
  label,
  done,
  pending,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  done?: boolean;
  pending?: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const tint = done ? colors.success : pending ? colors.warning : colors.mutedForeground;
  return (
    <View style={styles.step}>
      <View style={[styles.stepIcon, { backgroundColor: tint + "20" }]}>
        <Feather name={done ? "check-circle" : icon} size={20} color={tint} />
      </View>
      <Text
        style={[
          styles.stepLabel,
          {
            color: done ? colors.foreground : pending ? colors.foreground : colors.mutedForeground,
            fontFamily: done || pending ? "Inter_600SemiBold" : "Inter_400Regular",
          },
        ]}
      >
        {label}
      </Text>
      {pending && (
        <View style={[styles.pendingBadge, { backgroundColor: colors.warning + "20" }]}>
          <Text style={[styles.pendingText, { color: colors.warning }]}>En attente</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { alignItems: "center", gap: 10 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 340,
  },
  card: {
    width: "100%",
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    flex: 1,
    fontSize: 14,
  },
  stepDivider: {
    height: 1,
    marginLeft: 52,
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pendingText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
  },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  btn: {
    width: "100%",
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  btnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
});
