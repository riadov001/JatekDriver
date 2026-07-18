import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { customFetch } from "@workspace/api-client-react";

import { useAuth } from "@/contexts/AuthContext";

const EXPO_PROJECT_ID = "3bf3e2da-2317-4261-b2a4-d0a62426be7e";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function getExpoPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Jatek Livreur",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0EA472",
      });
    }

    // expo-notifications PermissionResponse shape varies by version; use any-cast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = (await Notifications.getPermissionsAsync()) as any;
    const alreadyGranted: boolean =
      existing.granted === true || existing.status === "granted";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requested = alreadyGranted ? existing : (await Notifications.requestPermissionsAsync()) as any;
    const finalGranted: boolean =
      requested.granted === true || requested.status === "granted";

    if (!finalGranted) return null;

    const { data } = await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PROJECT_ID,
    });
    return data;
  } catch (e) {
    console.warn("[push] getExpoPushToken failed:", e);
    return null;
  }
}

async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    await customFetch("/api/push-token", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch (e) {
    console.warn("[push] token registration failed:", e);
  }
}

/**
 * Registers the device for Expo push notifications and syncs the token
 * to the backend. Also handles notification taps to navigate to the
 * relevant order screen.
 *
 * Must be called inside a component that has access to AuthContext and
 * expo-router.
 */
export function usePushNotifications() {
  const { token: authToken } = useAuth();
  const router = useRouter();
  const registeredRef = useRef<string | null>(null);
  const tapListenerRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!authToken) return;

    let active = true;
    (async () => {
      const pushToken = await getExpoPushToken();
      if (!active || !pushToken) return;
      if (pushToken === registeredRef.current) return;
      registeredRef.current = pushToken;
      await registerTokenWithBackend(pushToken);
    })();

    return () => {
      active = false;
    };
  }, [authToken]);

  useEffect(() => {
    tapListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          orderId?: number;
        };
        if (data?.orderId) {
          router.push(`/order/${data.orderId}` as any);
        }
      },
    );
    return () => {
      tapListenerRef.current?.remove();
    };
  }, []);
}
