import { Feather } from "@expo/vector-icons";
import { useCompleteDriverProfile } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const VEHICLE_TYPES = ["Moto", "Vélo", "Voiture", "Scooter", "À pied"];

export default function CompleteProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { driverId, refreshDriver } = useAuth();

  const [vehicleType, setVehicleType] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const mutation = useCompleteDriverProfile({
    mutation: {
      onSuccess: async () => {
        await refreshDriver();
        router.back();
      },
      onError: (err: unknown) => {
        const msg =
          (err as { data?: { error?: string } })?.data?.error ??
          "Une erreur est survenue";
        Alert.alert("Erreur", msg);
      },
    },
  });

  const handleSubmit = () => {
    if (!driverId) return;
    if (!vehicleType) { Alert.alert("Champ manquant", "Sélectionnez un type de véhicule"); return; }
    if (!vehiclePlate.trim() || vehiclePlate.trim().length < 3) { Alert.alert("Champ manquant", "Entrez votre plaque d'immatriculation"); return; }
    if (!nationalId.trim() || nationalId.trim().length < 4) { Alert.alert("Champ manquant", "Entrez votre numéro de CIN"); return; }

    mutation.mutate({
      id: driverId,
      data: {
        vehicleType,
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        nationalId: nationalId.trim().toUpperCase(),
        licenseNumber: licenseNumber.trim() || undefined,
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <View style={[styles.iconBox, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="truck" size={32} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          Compléter votre profil
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Ces informations sont obligatoires pour accepter des livraisons.
        </Text>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Type de véhicule *</Text>
        <View style={styles.vehicleRow}>
          {VEHICLE_TYPES.map((v) => {
            const selected = vehicleType === v;
            return (
              <Pressable
                key={v}
                onPress={() => setVehicleType(v)}
                style={[
                  styles.vehicleChip,
                  {
                    backgroundColor: selected ? colors.primary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 13,
                    color: selected ? colors.primaryForeground : colors.foreground,
                  }}
                >
                  {v}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Plaque d'immatriculation *
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
              color: colors.foreground,
            },
          ]}
          value={vehiclePlate}
          onChangeText={setVehiclePlate}
          placeholder="Ex: 12345-A-1"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="characters"
          returnKeyType="next"
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Numéro CIN *
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
              color: colors.foreground,
            },
          ]}
          value={nationalId}
          onChangeText={setNationalId}
          placeholder="Ex: AB123456"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="characters"
          returnKeyType="next"
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Numéro de permis (optionnel)
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
              color: colors.foreground,
            },
          ]}
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          placeholder="Ex: 123456"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <Pressable
          onPress={handleSubmit}
          disabled={mutation.isPending}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              opacity: mutation.isPending || pressed ? 0.8 : 1,
            },
          ]}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
              Valider mon profil
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backBtn: { marginBottom: 24 },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  vehicleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vehicleChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  submitBtn: {
    marginTop: 32,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  submitText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
});
