/**
 * NewOrderAlertContext — Real-time new order alerts.
 *
 * Strategy:
 *  1. SSE channel `available_orders` — sub-2 s latency
 *  2. Polling fallback every 12 s (on SSE failure or offline mode)
 *
 * Auto-reconnects SSE on network restore.
 * Deduplicates — same order ID never alerts twice.
 * Clears alert automatically if another driver takes the order.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  getGetAvailableOrdersQueryKey,
  getListOrdersQueryKey,
  useAcceptOrderDelivery,
  useGetAvailableOrders,
  type Order,
} from "@workspace/api-client-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLocationTracking } from "@/contexts/LocationTrackingContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import * as SseService from "@/services/sse/SseService";
import { NewOrderAlertModal } from "@/components/NewOrderAlertModal";
import { t } from "@/i18n";

const ALERT_COUNTDOWN_SECONDS = 25;

interface NewOrderAlertValue {
  readonly sseStatus: SseService.SseStatus;
}

const NewOrderAlertContext = createContext<NewOrderAlertValue>({ sseStatus: "DISCONNECTED" });

// ── Provider ──────────────────────────────────────────────────────────────────

export function NewOrderAlertProvider({ children }: { children: ReactNode }) {
  const { driverId } = useAuth();
  const { online } = useLocationTracking();
  const { isReachable: isConnected } = useNetworkStatus();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [sseStatus, setSseStatus] = useState<SseService.SseStatus>("DISCONNECTED");

  const seenIdsRef       = useRef<Set<number>>(new Set());
  const dismissedIdsRef  = useRef<Set<number>>(new Set());
  const initializedRef   = useRef(false);

  // ── Polling (fallback + cache warm-up) ───────────────────────────────────

  const availableQuery = useGetAvailableOrders({
    query: {
      queryKey: getGetAvailableOrdersQueryKey(),
      enabled: online && !!driverId,
      refetchInterval: online ? 12_000 : false,
    },
  });

  // ── New order detection ───────────────────────────────────────────────────

  const handleNewOrders = useCallback((orders: Order[]) => {
    if (!initializedRef.current) {
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
          title: t("notifications.newOrder"),
          body: `${fresh.restaurantName} → ${fresh.deliveryAddress.split(",")[0]}`,
          sound: "default",
        },
        trigger: null,
      }).catch(() => {});
    }
  }, [pendingOrder]);

  useEffect(() => {
    if (availableQuery.data) handleNewOrders(availableQuery.data);
  }, [availableQuery.data, handleNewOrders]);

  // Clear alert if the order was taken by another driver.
  useEffect(() => {
    if (!pendingOrder || !availableQuery.isFetchedAfterMount) return;
    const still = (availableQuery.data ?? []).some((o) => o.id === pendingOrder.id);
    if (!still) setPendingOrder(null);
  }, [availableQuery.data, availableQuery.isFetchedAfterMount, pendingOrder]);

  // ── SSE lifecycle ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!online || !driverId) {
      SseService.stop();
      setSseStatus("DISCONNECTED");
      return;
    }

    SseService.start({
      driverId,
      onStatusChange: setSseStatus,
      onEvent: (event) => {
        if (event.type === "order_ready" || event.type === "order_new") {
          queryClient.invalidateQueries({ queryKey: getGetAvailableOrdersQueryKey() });
        }
        if (event.type === "order_assigned" || event.type === "delivery_completed") {
          queryClient.invalidateQueries({
            queryKey: getListOrdersQueryKey({ driverId: driverId ?? undefined }),
          });
        }
      },
      pollFn: async () => {
        await queryClient.refetchQueries({ queryKey: getGetAvailableOrdersQueryKey() });
      },
    });

    return () => { SseService.stop(); };
  }, [online, driverId, queryClient]);

  // Reconnect SSE on network restore.
  useEffect(() => {
    if (isConnected && online && driverId) SseService.reconnect();
  }, [isConnected, online, driverId]);

  // Reset state when driver goes offline.
  useEffect(() => {
    if (!online) {
      SseService.stop();
      initializedRef.current = false;
      setPendingOrder(null);
    }
  }, [online]);

  // ── Accept / Decline ──────────────────────────────────────────────────────

  const acceptMutation = useAcceptOrderDelivery({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAvailableOrdersQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getListOrdersQueryKey({ driverId: driverId ?? undefined }),
        });
      },
    },
  });

  const handleAccept = useCallback(async () => {
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
      // Order taken — list will auto-refresh.
    }
  }, [pendingOrder, driverId, acceptMutation, router]);

  const handleDecline = useCallback(() => {
    if (!pendingOrder) return;
    dismissedIdsRef.current.add(pendingOrder.id);
    setPendingOrder(null);
  }, [pendingOrder]);

  return (
    <NewOrderAlertContext.Provider value={{ sseStatus }}>
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

export function useNewOrderAlert(): NewOrderAlertValue {
  return useContext(NewOrderAlertContext);
}
