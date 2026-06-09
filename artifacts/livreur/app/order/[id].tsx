import { Feather } from "@expo/vector-icons";
import {
  getListOrdersQueryKey,
  useConfirmOrderDelivery,
  useListOrders,
  type Order,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useLocationTracking } from "@/contexts/LocationTrackingContext";
import { useColors } from "@/hooks/useColors";
import { useDirections } from "@/hooks/useDirections";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  preparing: "En préparation",
  ready: "Prête",
  picked_up: "Récupérée",
  en_route: "En route",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const STATUS_COLOR: Record<string, string> = {
  picked_up: "#EA580C",
  en_route: "#7C3AED",
  delivered: "#10B981",
};

export default function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const { driverId } = useAuth();
  const { coords } = useLocationTracking();

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const otpRef = useRef<TextInput>(null);
  const mapRef = useRef<MapView>(null);
  const [followDriver, setFollowDriver] = useState(true);

  const ordersQuery = useListOrders(
    { driverId: driverId ?? undefined },
    {
      query: {
        queryKey: getListOrdersQueryKey({ driverId: driverId ?? undefined }),
        enabled: !!driverId,
        refetchInterval: 8000,
      },
    },
  );

  const order: Order | undefined = useMemo(
    () => (ordersQuery.data ?? []).find((o: Order) => o.id === orderId),
    [ordersQuery.data, orderId],
  );

  const isActive = order?.status === "picked_up" || order?.status === "en_route";

  const {
    polyline,
    restaurantCoords,
    deliveryCoords,
    distanceText,
    durationText,
    loading: directionsLoading,
    refetch: refetchDirections,
  } = useDirections(
    isActive ? coords : null,
    isActive ? order?.restaurantAddress ?? order?.restaurantName : undefined,
    isActive ? order?.deliveryAddress : undefined,
  );

  // Auto-follow driver on map
  useEffect(() => {
    if (followDriver && coords && mapRef.current && Platform.OS !== "web") {
      mapRef.current.animateToRegion(
        { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 },
        400,
      );
    }
  }, [coords, followDriver]);

  const confirmDelivery = useConfirmOrderDelivery({
    mutation: {
      onSuccess: () => {
        ordersQuery.refetch();
        setOtpModalVisible(false);
        setOtpValue("");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      },
      onError: (err: unknown) => {
        const msg =
          (err as { data?: { error?: string } })?.data?.error ??
          "Code OTP incorrect";
        Alert.alert("Code incorrect", msg);
        setOtpValue("");
        setTimeout(() => otpRef.current?.focus(), 100);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }
      },
    },
  });

  const handleOpenOtpModal = () => {
    setOtpValue("");
    setOtpModalVisible(true);
    setTimeout(() => otpRef.current?.focus(), 300);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };

  const handleConfirmDelivery = () => {
    const code = otpValue.trim();
    if (!/^\d{4,6}$/.test(code)) {
      Alert.alert("Code invalide", "Entrez le code à 4–6 chiffres affiché sur le téléphone du client.");
      return;
    }
    confirmDelivery.mutate({ id: orderId, data: { pickupCode: code } });
  };

  const handleNavigate = async () => {
    if (!order) return;
    const dest = encodeURIComponent(order.deliveryAddress);
    const gmapsUrl = Platform.select({
      ios: `comgooglemaps://?daddr=${dest}&directionsmode=driving`,
      android: `google.navigation:q=${dest}&mode=d`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
    }) as string;

    const canOpen = await Linking.canOpenURL(gmapsUrl);
    if (canOpen) {
      Linking.openURL(gmapsUrl);
    } else {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
    }
  };

  if (ordersQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>
          Commande introuvable
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.ghostBtn, { borderRadius: colors.radius, borderColor: colors.border }]}
        >
          <Text style={[styles.ghostBtnText, { color: colors.foreground }]}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const statusColor = STATUS_COLOR[order.status] ?? colors.primary;

  const mapRegion =
    coords
      ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
      : { latitude: 33.5731, longitude: -7.5898, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  const hasEta = distanceText && durationText;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Map ── */}
        {isActive && (
          <View style={styles.mapContainer}>
            {Platform.OS !== "web" ? (
              <>
                <MapView
                  ref={mapRef}
                  style={StyleSheet.absoluteFillObject}
                  provider={PROVIDER_GOOGLE}
                  region={mapRegion}
                  showsUserLocation
                  showsMyLocationButton={false}
                  showsCompass={false}
                  onPanDrag={() => setFollowDriver(false)}
                >
                  {/* Route polyline */}
                  {polyline.length > 0 && (
                    <Polyline
                      coordinates={polyline}
                      strokeColor={colors.primary}
                      strokeWidth={4}
                    />
                  )}

                  {/* Restaurant marker (green) */}
                  {restaurantCoords && (
                    <Marker
                      coordinate={restaurantCoords}
                      title="Restaurant"
                      description={order.restaurantName}
                      pinColor="#16A34A"
                    />
                  )}

                  {/* Delivery marker (red) */}
                  {deliveryCoords && (
                    <Marker
                      coordinate={deliveryCoords}
                      title="Livraison"
                      description={order.deliveryAddress}
                      pinColor="#DC2626"
                    />
                  )}

                  {/* Driver marker */}
                  {coords && (
                    <Marker
                      coordinate={{ latitude: coords.latitude, longitude: coords.longitude }}
                      title="Vous"
                      pinColor={colors.primary}
                    />
                  )}
                </MapView>

                {/* ETA banner */}
                {hasEta && (
                  <View style={[styles.etaBanner, { backgroundColor: colors.card }]}>
                    <Feather name="clock" size={14} color={colors.primary} />
                    <Text style={[styles.etaText, { color: colors.foreground }]}>
                      {distanceText} · {durationText}
                    </Text>
                    {directionsLoading && (
                      <ActivityIndicator size="small" color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                    )}
                  </View>
                )}

                {/* Controls: follow + recalculate */}
                <View style={styles.mapControls}>
                  <Pressable
                    onPress={() => { setFollowDriver(true); }}
                    style={[
                      styles.mapControlBtn,
                      { backgroundColor: followDriver ? colors.primary : colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Feather
                      name="navigation"
                      size={16}
                      color={followDriver ? "#fff" : colors.foreground}
                    />
                  </Pressable>
                  <Pressable
                    onPress={refetchDirections}
                    style={[styles.mapControlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Feather name="refresh-cw" size={16} color={colors.foreground} />
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={[StyleSheet.absoluteFillObject, styles.mapFallback, { backgroundColor: colors.card }]}>
                <Feather name="map" size={32} color={colors.mutedForeground} />
                <Text style={[styles.mapFallbackText, { color: colors.mutedForeground }]}>
                  Carte disponible sur mobile
                </Text>
              </View>
            )}

            {/* Destination overlay */}
            <View style={[styles.destOverlay, { backgroundColor: colors.card }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.destLabel, { color: colors.mutedForeground }]}>Destination</Text>
                <Text style={[styles.destAddress, { color: colors.foreground }]} numberOfLines={2}>
                  {order.deliveryAddress}
                </Text>
              </View>
              <Pressable
                onPress={handleNavigate}
                style={[styles.navBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              >
                <Feather name="navigation" size={16} color="#fff" />
                <Text style={styles.navBtnText}>Naviguer</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ padding: 20, gap: 16 }}>
          {/* ── Header ── */}
          <View style={styles.headerBlock}>
            <Text style={[styles.reference, { color: colors.mutedForeground }]}>
              #{order.reference ?? order.id}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {order.restaurantName}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: statusColor + "22" }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[order.status] ?? order.status}
              </Text>
            </View>
          </View>

          {/* ── Client info ── */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Client</Text>
            <View style={styles.row}>
              <Feather name="user" size={15} color={colors.foreground} />
              <Text style={[styles.rowText, { color: colors.foreground }]}>{order.userName}</Text>
            </View>
            <View style={styles.row}>
              <Feather name="map-pin" size={15} color={colors.primary} />
              <Text style={[styles.rowText, { color: colors.foreground, flex: 1 }]}>
                {order.deliveryAddress}
              </Text>
            </View>
            {order.notes ? (
              <View style={styles.row}>
                <Feather name="message-circle" size={15} color={colors.mutedForeground} />
                <Text style={[styles.rowText, { color: colors.mutedForeground, flex: 1 }]}>
                  {order.notes}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── Articles ── */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Articles</Text>
            {(order.items ?? []).map((item: { id: number; quantity: number; menuItemName: string; totalPrice: number }) => (
              <View key={item.id} style={styles.itemRow}>
                <Text
                  style={[
                    styles.itemQty,
                    { color: colors.primaryForeground, backgroundColor: colors.primary, borderRadius: 6 },
                  ]}
                >
                  {item.quantity}×
                </Text>
                <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                  {item.menuItemName}
                </Text>
                <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                  {item.totalPrice.toFixed(2)} MAD
                </Text>
              </View>
            ))}
          </View>

          {/* ── Totaux ── */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border },
            ]}
          >
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Sous-total</Text>
              <Text style={[styles.totalValue, { color: colors.foreground }]}>
                {order.subtotal.toFixed(2)} MAD
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Livraison</Text>
              <Text style={[styles.totalValue, { color: colors.foreground }]}>
                {order.deliveryFee.toFixed(2)} MAD
              </Text>
            </View>
            <View
              style={[
                styles.totalRow,
                { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
              ]}
            >
              <Text style={[styles.totalLabelStrong, { color: colors.foreground }]}>Total</Text>
              <Text style={[styles.totalValueStrong, { color: colors.foreground }]}>
                {order.total.toFixed(2)} MAD
              </Text>
            </View>
            <View style={[styles.totalRow, { marginTop: 6 }]}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Votre gain</Text>
              <Text style={[styles.gainValue, { color: "#10B981" }]}>
                +{((order.deliveryFee ?? 0) * 0.8).toFixed(2)} MAD
              </Text>
            </View>
          </View>

          {/* ── Livraison terminée ── */}
          {order.status === "delivered" && (
            <View
              style={[
                styles.successBox,
                { backgroundColor: "#10B98122", borderRadius: colors.radius },
              ]}
            >
              <Feather name="check-circle" size={22} color="#10B981" />
              <View>
                <Text style={[styles.successTitle, { color: "#10B981" }]}>Livraison terminée</Text>
                <Text style={[styles.successSub, { color: "#10B981" }]}>
                  Gains crédités : +{((order.deliveryFee ?? 0) * 0.8).toFixed(2)} MAD
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Bouton flottant "Marquer livrée" ── */}
      {isActive && (
        <View
          style={[
            styles.fabContainer,
            { paddingBottom: insets.bottom + 12, backgroundColor: colors.background },
          ]}
        >
          <Pressable
            onPress={handleOpenOtpModal}
            style={({ pressed }) => [
              styles.fabBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Feather name="check-circle" size={20} color="#fff" />
            <Text style={styles.fabText}>Marquer livrée</Text>
          </Pressable>
        </View>
      )}

      {/* ── Modal OTP ── */}
      <Modal
        visible={otpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setOtpModalVisible(false)}
        />
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 24,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            },
          ]}
        >
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

          <View style={styles.modalIconRow}>
            <View style={[styles.modalIconBg, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="lock" size={26} color={colors.primary} />
            </View>
          </View>

          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            Code de confirmation
          </Text>
          <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
            Demandez le code OTP affiché sur le téléphone du client et saisissez-le ci-dessous.
          </Text>

          <TextInput
            ref={otpRef}
            style={[
              styles.otpInput,
              {
                backgroundColor: colors.background,
                borderColor: otpValue.length > 0 ? colors.primary : colors.border,
                borderRadius: colors.radius,
                color: colors.foreground,
              },
            ]}
            value={otpValue}
            onChangeText={setOtpValue}
            placeholder="• • • • • •"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
            returnKeyType="done"
            onSubmitEditing={handleConfirmDelivery}
          />

          <Pressable
            onPress={handleConfirmDelivery}
            disabled={confirmDelivery.isPending}
            style={({ pressed }) => [
              styles.confirmBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
                opacity: pressed || confirmDelivery.isPending ? 0.85 : 1,
              },
            ]}
          >
            {confirmDelivery.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={18} color="#fff" />
                <Text style={styles.confirmBtnText}>Confirmer la livraison</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => setOtpModalVisible(false)}
            style={styles.cancelBtn}
          >
            <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Annuler</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  notFoundText: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  ghostBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  ghostBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },

  /* Map */
  mapContainer: { height: 320, position: "relative" },
  mapFallback: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mapFallbackText: { fontFamily: "Inter_500Medium", fontSize: 13 },

  /* ETA banner */
  etaBanner: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  etaText: { fontFamily: "Inter_700Bold", fontSize: 14 },

  /* Map controls */
  mapControls: {
    position: "absolute",
    top: 10,
    right: 10,
    gap: 8,
  },
  mapControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  destOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  destLabel: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  destAddress: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 2 },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  navBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },

  /* Header */
  headerBlock: { gap: 6 },
  reference: { fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.5 },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },

  /* Cards */
  card: { padding: 16, borderWidth: 1, gap: 10 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 3 },
  itemQty: { fontFamily: "Inter_700Bold", fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, overflow: "hidden" },
  itemName: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14 },
  itemPrice: { fontFamily: "Inter_600SemiBold", fontSize: 14 },

  /* Totaux */
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  totalValue: { fontFamily: "Inter_500Medium", fontSize: 14 },
  totalLabelStrong: { fontFamily: "Inter_700Bold", fontSize: 15 },
  totalValueStrong: { fontFamily: "Inter_700Bold", fontSize: 18 },
  gainValue: { fontFamily: "Inter_700Bold", fontSize: 15 },

  /* Succès */
  successBox: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  successSub: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 2 },

  /* FAB */
  fabContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fabBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  fabText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },

  /* Modal */
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 14,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalIconRow: { alignItems: "center" },
  modalIconBg: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "center" },
  modalSub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  otpInput: {
    borderWidth: 2,
    paddingVertical: 18,
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: 12,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    minHeight: 58,
  },
  confirmBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  cancelBtn: { alignItems: "center", paddingVertical: 10 },
  cancelBtnText: { fontFamily: "Inter_500Medium", fontSize: 14 },
});
