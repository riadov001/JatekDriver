import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
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
import { customFetch, type AuthResponse } from "@workspace/api-client-react";

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const validate = (): string | null => {
    if (!name.trim() || name.trim().length < 2)
      return "Veuillez saisir votre nom complet (2 caractères minimum)";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return "Veuillez saisir une adresse email valide";
    if (phone.trim() && !/^[+\d\s\-()]{6,20}$/.test(phone.trim()))
      return "Numéro de téléphone invalide";
    if (!password || password.length < 6)
      return "Le mot de passe doit contenir au moins 6 caractères";
    if (password !== confirmPassword)
      return "Les mots de passe ne correspondent pas";
    return null;
  };

  const onSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await customFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: "driver",
          phone: phone.trim() || null,
        }),
      });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      router.replace("/pending-validation");
    } catch (e: unknown) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
      const msg = e instanceof Error ? e.message : "";
      let friendly = "Une erreur est survenue. Réessayez.";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("existe") || msg.includes("409") || msg.includes("400")) {
        friendly = "Un compte avec cet email existe déjà. Connectez-vous.";
      } else if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
        friendly = "Impossible de joindre le serveur. Vérifiez votre connexion.";
      } else if (msg.trim()) {
        friendly = msg;
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
            Rejoignez la flotte Jatek Livreur
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={[styles.title, { color: colors.foreground }]}>Créer un compte</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Remplissez vos informations. Votre compte sera validé par un administrateur.
          </Text>

          <View style={[styles.infoBanner, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40", borderRadius: colors.radius }]}>
            <Feather name="info" size={15} color={colors.primary} />
            <Text style={[styles.infoBannerText, { color: colors.primary }]}>
              Après inscription, un administrateur validera votre compte avant votre première connexion.
            </Text>
          </View>

          <Field label="Nom complet *" icon="user" colors={colors}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Mohamed Alami"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              style={[styles.input, { color: colors.foreground }]}
            />
          </Field>

          <Field label="Email *" icon="mail" colors={colors}>
            <TextInput
              ref={emailRef}
              value={email}
              onChangeText={setEmail}
              placeholder="vous@exemple.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              style={[styles.input, { color: colors.foreground }]}
            />
          </Field>

          <Field label="Téléphone" icon="phone" colors={colors}>
            <TextInput
              ref={phoneRef}
              value={phone}
              onChangeText={setPhone}
              placeholder="+212 6XX XX XX XX"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={[styles.input, { color: colors.foreground }]}
            />
          </Field>

          <Field
            label="Mot de passe *"
            icon="lock"
            colors={colors}
            suffix={
              <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            }
          >
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 caractères"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              style={[styles.input, { color: colors.foreground }]}
            />
          </Field>

          <Field
            label="Confirmer le mot de passe *"
            icon="lock"
            colors={colors}
            suffix={
              <Pressable onPress={() => setShowConfirm((s) => !s)} hitSlop={10}>
                <Feather name={showConfirm ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            }
          >
            <TextInput
              ref={confirmRef}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Répétez votre mot de passe"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              style={[styles.input, { color: colors.foreground }]}
            />
          </Field>

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
              <>
                <Feather name="user-plus" size={18} color={colors.primaryForeground} />
                <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
                  Créer mon compte
                </Text>
              </>
            )}
          </Pressable>

          <View style={styles.loginRow}>
            <Text style={[styles.loginLabel, { color: colors.mutedForeground }]}>
              Déjà un compte ?
            </Text>
            <Pressable onPress={() => router.replace("/login")} hitSlop={8}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>Se connecter</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function Field({
  label,
  icon,
  colors,
  children,
  suffix,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  children: React.ReactNode;
  suffix?: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Feather name={icon} size={18} color={colors.mutedForeground} />
        {children}
        {suffix}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
    justifyContent: "center",
    gap: 28,
  },
  brand: { alignItems: "center", gap: 10, marginTop: 24 },
  tagline: { fontFamily: "Inter_400Regular", fontSize: 14 },
  formCard: { gap: 14 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, marginTop: -6 },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },
  infoBannerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  field: { gap: 6 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    height: 52,
  },
  input: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, height: "100%" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
  },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  button: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
  buttonText: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: 0.3 },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  loginLabel: { fontFamily: "Inter_400Regular", fontSize: 14 },
  loginLink: { fontFamily: "Inter_700Bold", fontSize: 14 },
});
