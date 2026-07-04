import {
  getGetAvailableOrdersQueryKey,
  getListOrdersQueryKey,
  useAcceptOrderDelivery,
  useGetAvailableOrders,
  type Order,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useLocationTracking } from "@/contexts/LocationTrackingContext";
import { NewOrderAlertModal } from "@/components/NewOrderAlertModal";

const NewOrderAlertContext = createContext<null>(null);

const ALERT_COUNTDOWN_SECONDS = 20;

export function NewOrderAlertProvider({ children }: { children: ReactNode }) {
  const { driverId } = useAuth();
  const { online } = useLocationTracking();
  const queryClient = useQueryClient();
  const router = useRouter();

  const seenIdsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const dismissedIdsRef = useRef<Set<number>>(new Set());

  const availableQuery = useGetAvailableOrders({
    query: {
      queryKey: getGetAvailableOrdersQueryKey(),
      enabled: online && !!driverId,
      refetchInterval: online ? 5000 : false,
    },
  });

  const acceptMutation = useAcceptOrderDelivery({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAvailableOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ driverId: driverId ?? undefined }) });
      },
    },
  });

  useEffect(() => {
    const orders = availableQuery.data ?? [];

    if (!initializedRef.current) {
      // Don't alert for orders that already existed before the driver went online.
      seenIdsRef.current = new Set(orders.map((o) => o.id));
      initializedRef.current = true;
      return;
    }

    const fresh = orders.find(
      (o) => !seenIdsRef.current.has(o.id) && !dismissedIdsRef.current.has(o.id),
    );

    orders.forEach((o) => seenIdsRef.current.add(o.id));

    if (fresh && !pendingOrder) {
      setPendingOrder(fresh);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
      Notifications.scheduleNotificationAsync({
        content: {
          title: "📦 Nouvelle course disponible !",
          body: `${fresh.restaurantName} → ${fresh.deliveryAddress.split(",")[0]}`,
          sound: "default",
        },
        trigger: null,
      }).catch(() => {});
    }
  }, [availableQuery.data, pendingOrder]);

  // If the pending order got taken by someone else or expired, clear it.
  useEffect(() => {
    if (!pendingOrder) return;
    const stillAvailable = (availableQuery.data ?? []).some((o) => o.id === pendingOrder.id);
    if (!stillAvailable) {
      setPendingOrder(null);
    }
  }, [availableQuery.data, pendingOrder]);

  const handleAccept = async () => {
    if (!pendingOrder || !driverId) return;
    const order = pendingOrder;
    setPendingOrder(null);
    try {
      await acceptMutation.mutateAsync({ id: order.id, data: { driverId } });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      router.push(`/order/${order.id}`);
    } catch {
      // Order likely taken by another driver — silently ignore, list will refresh.
    }
  };

  const handleDecline = () => {
    if (!pendingOrder) return;
    dismissedIdsRef.current.add(pendingOrder.id);
    setPendingOrder(null);
  };

  return (
    <NewOrderAlertContext.Provider value={null}>
      {children}
      <NewOrderAlertModal
        order={pendingOrder}
        visible={!!pendingOrder}
        countdownSeconds={ALERT_COUNTDOWN_SECONDS}
        accepting={acceptMutation.isPending}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onExpire={handleDecline}
      />
    </NewOrderAlertContext.Provider>
  );
}

export function useNewOrderAlert() {
  return useContext(NewOrderAlertContext);
}
