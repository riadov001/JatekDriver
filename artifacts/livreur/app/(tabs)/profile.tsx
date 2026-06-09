import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useLocationTracking } from "@/contexts/LocationTrackingContext";
import { useColors } from "@/hooks/useColors";

interface RowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}

function Row({ icon, label, value }: RowProps) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={16} color={colors.mutedForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.foreground }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, driver, logout } = useAuth();
  const { setOnline } = useLocationTracking();

  const handleLogout = () => {
    const doLogout = async () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      await setOnline(false);
      await logout();
      router.replace("/login");
    };
    if (Platform.OS === "web") {
      doLogout();
    } else {
      Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Se déconnecter", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const fullName: string = driver?.name ?? user?.name ?? "??";
  const initials: string = fullName
    .split(" ")
    .filter((w: string) => w.length > 0)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + webTopInset + 12,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: 20,
      }}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Profil</Text>

      <View
        style={[
          styles.headerCard,
          { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {initials || "L"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {driver?.name ?? user?.name ?? "Livreur"}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]} numberOfLines={1}>
            {user?.email ?? "—"}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: colors.primary + "33" }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {driver?.isAvailable ? "En ligne" : "Hors ligne"}
              </Text>
            </View>
            {driver?.rating != null ? (
              <View style={[styles.badge, { backgroundColor: colors.warning + "22" }]}>
                <Feather name="star" size={11} color={colors.warning} />
                <Text style={[styles.badgeText, { color: colors.warning, marginLeft: 4 }]}>
                  {driver.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Véhicule</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
        ]}
      >
        <Row icon="truck" label="Type" value={driver?.vehicleType ?? "Non renseigné"} />
        <Row icon="hash" label="Plaque" value={driver?.vehiclePlate ?? "Non renseigné"} />
        <Row icon="credit-card" label="Permis" value={driver?.licenseNumber ?? "—"} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Compte</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
        ]}
      >
        <Row icon="phone" label="Téléphone" value={user?.phone ?? "—"} />
        <Row
          icon="package"
          label="Livraisons totales"
          value={String(driver?.totalDeliveries ?? 0)}
        />
      </View>

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logout,
          {
            backgroundColor: colors.destructive,
            borderRadius: colors.radius,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Feather name="log-out" size={18} color={colors.destructiveForeground} />
        <Text style={[styles.logoutText, { color: colors.destructiveForeground }]}>
          Se déconnecter
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: "Inter_700Bold", fontSize: 28, letterSpacing: -0.5, marginBottom: 16 },
  headerCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 22 },
  name: { fontFamily: "Inter_700Bold", fontSize: 18 },
  email: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  rowValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginTop: 2,
  },
  logout: {
    marginTop: 28,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  logoutText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
