import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Logo } from "@/components/Logo";
import { useColors } from "@/hooks/useColors";
import { customFetch } from "@workspace/api-client-react";

type Step = "email" | "code" | "done";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const sendCode = async () => {
    if (!email.trim()) { setError("Veuillez saisir votre email"); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await customFetch<{ success: boolean; demoOtp?: string }>(
        "/api/auth/forgot-password",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim().toLowerCase() }) }
      );
      if (res.demoOtp) setDemoOtp(res.demoOtp);
      setStep("code");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!code.trim()) { setError("Veuillez saisir le code reçu"); return; }
    if (!newPassword || newPassword.length < 6) { setError("Mot de passe : 6 caractères minimum"); return; }
    setError(null);
    setLoading(true);
    try {
      await customFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), newPassword }),
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStep("done");
    } catch (e: unknown) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e instanceof Error ? e.message : "Code invalide ou expiré");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + webTopInset }]}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bottomOffset={20}>
        <View style={styles.brand}>
          <Logo size="lg" />
        </View>

        <View style={styles.formCard}>
          {step === "email" && (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>Mot de passe oublié</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Saisissez votre email. Vous recevrez un code de vérification.
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

              {error && <ErrorBox error={error} colors={colors} />}

              <Pressable onPress={sendCode} disabled={loading} style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed || loading ? 0.85 : 1 }]}>
                {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Envoyer le code</Text>}
              </Pressable>
            </>
          )}

          {step === "code" && (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>Nouveau mot de passe</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Saisissez le code reçu et choisissez un nouveau mot de passe.
              </Text>

              {demoOtp && (
                <View style={[styles.demoBox, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
                  <Feather name="info" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.demoText, { color: colors.mutedForeground }]}>Code de démo : {demoOtp}</Text>
                </View>
              )}

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Code reçu</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius }]}>
                  <Feather name="hash" size={18} color={colors.mutedForeground} />
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="123456"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    style={[styles.input, { color: colors.foreground }]}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Nouveau mot de passe</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius }]}>
                  <Feather name="lock" size={18} color={colors.mutedForeground} />
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    style={[styles.input, { color: colors.foreground }]}
                  />
                  <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10}>
                    <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>

              {error && <ErrorBox error={error} colors={colors} />}

              <Pressable onPress={resetPassword} disabled={loading} style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed || loading ? 0.85 : 1 }]}>
                {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Réinitialiser</Text>}
              </Pressable>

              <Pressable onPress={() => { setError(null); setStep("email"); }} style={styles.linkBtn}>
                <Text style={[styles.linkText, { color: colors.mutedForeground }]}>Renvoyer le code</Text>
              </Pressable>
            </>
          )}

          {step === "done" && (
            <>
              <View style={[styles.successIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="check-circle" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>Mot de passe modifié !</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
              </Text>
              <Pressable
                onPress={() => router.replace("/login")}
                style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Se connecter</Text>
              </Pressable>
            </>
          )}

          <Pressable onPress={() => router.back()} style={styles.linkBtn}>
            <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
            <Text style={[styles.linkText, { color: colors.mutedForeground }]}>Retour</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function ErrorBox({ error, colors }: { error: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.errorBox, { backgroundColor: colors.destructive + "22", borderColor: colors.destructive, borderRadius: colors.radius }]}>
      <Feather name="alert-circle" size={16} color={colors.destructive} />
      <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, justifyContent: "center", gap: 32 },
  brand: { alignItems: "center", marginTop: 32 },
  formCard: { gap: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: -8, marginBottom: 8 },
  field: { gap: 6 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderWidth: 1, height: 52 },
  input: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, height: "100%" },
  button: { height: 54, alignItems: "center", justifyContent: "center", marginTop: 8 },
  buttonText: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: 0.3 },
  linkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  linkText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderWidth: 1 },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  demoBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10 },
  demoText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  successIcon: { alignSelf: "center", width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 },
});
