import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/components/Logo";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { storage } from "@/lib/storage";

const BIOMETRIC_KEY = "jatek_biometric_enabled";
const TOKEN_KEY = "jatek_driver_token";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, hydrate } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
      const [hardware, enrolled, enabled, token] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        storage.getItemAsync(BIOMETRIC_KEY),
        storage.getItemAsync(TOKEN_KEY),
      ]);
      const available = hardware && enrolled && !!token;
      setBiometricAvailable(available);
      setBiometricEnabled(available && enabled === "true");
    })();
  }, []);

  const loginWithBiometric = async () => {
    setBiometricLoading(true);
    setError(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Connexion par empreinte digitale",
        cancelLabel: "Annuler",
        fallbackLabel: "Mot de passe",
      });
      if (!result.success) {
        setError("Authentification annulée");
        return;
      }
      await hydrate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace("/(tabs)");
    } catch {
      setError("Échec de l'authentification biométrique");
    } finally {
      setBiometricLoading(false);
    }
  };

  const promptEnableBiometric = async () => {
    if (Platform.OS === "web") return;
    const hardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hardware || !enrolled) return;
    Alert.alert(
      "Connexion par empreinte",
      "Voulez-vous activer la connexion par empreinte digitale pour les prochaines connexions ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Activer",
          onPress: async () => {
            await storage.setItemAsync(BIOMETRIC_KEY, "true");
            setBiometricEnabled(true);
          },
        },
      ]
    );
  };

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Veuillez saisir votre email et votre mot de passe");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await promptEnableBiometric();
      router.replace("/(tabs)");
    } catch (e: unknown) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const msg = e instanceof Error ? e.message : "Échec de la connexion";
      let friendly = "Échec de la connexion. Réessayez.";
      if (msg.includes("401") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("invalid")) {
        friendly = "Email ou mot de passe incorrect";
      } else if (msg.toLowerCase().includes("livreur")) {
        friendly = "Ce compte n'est pas un compte livreur. Utilisez uniquement un compte livreur.";
      } else if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("failed to fetch")) {
        friendly = "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
      } else if (msg.includes("<!") || msg.toLowerCase().includes("parse") || msg.toLowerCase().includes("json")) {
        friendly = "Erreur de connexion au serveur. Réessayez dans quelques instants.";
      } else if (msg.toLowerCase().includes("disabled") || msg.toLowerCase().includes("désactivé")) {
        friendly = "Ce compte est désactivé. Contactez l'administrateur.";
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + webTopInset }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <View style={styles.brand}>
          <Logo size="lg" />
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Livraison rapide. Gains immédiats.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={[styles.title, { color: colors.foreground }]}>Connexion</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Accédez à votre espace livreur
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Feather name="mail" size={18} color={colors.mutedForeground} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="vous@exemple.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.foreground }]}
              />
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Mot de passe</Text>
              <Pressable onPress={() => router.push("/forgot-password")} hitSlop={8}>
                <Text style={[styles.forgotLink, { color: colors.primary }]}>Mot de passe oublié ?</Text>
              </Pressable>
            </View>
            <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.foreground }]}
              />
              <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "22", borderColor: colors.destructive, borderRadius: colors.radius }]}>
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={onSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed || loading ? 0.85 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
                Se connecter
              </Text>
            )}
          </Pressable>

          {biometricAvailable && biometricEnabled && (
            <Pressable
              onPress={loginWithBiometric}
              disabled={biometricLoading}
              style={({ pressed }) => [
                styles.biometricBtn,
                {
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  backgroundColor: colors.card,
                  opacity: pressed || biometricLoading ? 0.75 : 1,
                },
              ]}
            >
              {biometricLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Feather name="activity" size={22} color={colors.primary} />
                  <Text style={[styles.biometricText, { color: colors.foreground }]}>
                    Connexion par empreinte
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "center",
    gap: 32,
  },
  brand: { alignItems: "center", gap: 12, marginTop: 32 },
  tagline: { fontFamily: "Inter_400Regular", fontSize: 14 },
  formCard: { gap: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: -8, marginBottom: 8 },
  field: { gap: 6 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  forgotLink: { fontFamily: "Inter_500Medium", fontSize: 12 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    height: 52,
  },
  input: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, height: "100%" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderWidth: 1 },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  button: { height: 54, alignItems: "center", justifyContent: "center", marginTop: 8 },
  buttonText: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: 0.3 },
  biometricBtn: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
  },
  biometricText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
