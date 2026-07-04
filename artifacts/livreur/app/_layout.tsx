import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocationTrackingProvider } from "@/contexts/LocationTrackingContext";
import { NewOrderAlertProvider } from "@/contexts/NewOrderAlertContext";
import { useColors } from "@/hooks/useColors";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { storage } from "@/lib/storage";

const REMOTE_CONFIG_CACHE_KEY = "jatek_remote_config";

/**
 * Bootstrap URL — used to fetch the remote config on first launch.
 * Priority: EXPO_PUBLIC_API_URL > EXPO_PUBLIC_API_DOMAIN > production URL.
 */
const BOOTSTRAP_URL = process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, "")
  : process.env.EXPO_PUBLIC_API_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
    : "https://ma.jatek.app";

setBaseUrl(BOOTSTRAP_URL);

setAuthTokenGetter(async () => {
  try {
    return await storage.getItemAsync("jatek_driver_token");
  } catch {
    return null;
  }
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface RemoteConfig {
  primaryUrl: string;
  fallbackUrl1: string | null;
  fallbackUrl2: string | null;
}

/**
 * Resolves the API base URL from the remote config endpoint (or cached value).
 * Always resolves — worst case it keeps the BOOTSTRAP_URL.
 * Capped at 4 s so a slow network never blocks app startup.
 */
async function loadRemoteConfig(): Promise<void> {
  const TIMEOUT_MS = 4000;

  const fetchWithTimeout = async (): Promise<void> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${BOOTSTRAP_URL}/api/remoteconfig`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const config: RemoteConfig = await res.json();
        if (config.primaryUrl) {
          setBaseUrl(config.primaryUrl.replace(/\/+$/, ""));
          await storage.setItemAsync(REMOTE_CONFIG_CACHE_KEY, JSON.stringify(config));
        }
      }
    } catch {
      clearTimeout(timer);
      try {
        const cached = await storage.getItemAsync(REMOTE_CONFIG_CACHE_KEY);
        if (cached) {
          const config: RemoteConfig = JSON.parse(cached);
          if (config.primaryUrl) {
            setBaseUrl(config.primaryUrl.replace(/\/+$/, ""));
          }
        }
      } catch {
        // keep BOOTSTRAP_URL
      }
    }
  };

  await fetchWithTimeout();
}

function PushNotificationRegistrar() {
  usePushNotifications();
  return null;
}

function RootLayoutNav() {
  const colors = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
          contentStyle: { backgroundColor: colors.background },
          headerBackTitle: "Retour",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="complete-profile" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="order/[id]"
          options={{ headerShown: true, title: "Commande" }}
        />
      </Stack>
      <OfflineBanner />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [remoteConfigReady, setRemoteConfigReady] = useState(false);
  const remoteConfigStarted = useRef(false);

  useEffect(() => {
    if (!remoteConfigStarted.current) {
      remoteConfigStarted.current = true;
      loadRemoteConfig().finally(() => setRemoteConfigReady(true));
    }
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && remoteConfigReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, remoteConfigReady]);

  if ((!fontsLoaded && !fontError) || !remoteConfigReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <LocationTrackingProvider>
                  <NewOrderAlertProvider>
                    <PushNotificationRegistrar />
                    <RootLayoutNav />
                  </NewOrderAlertProvider>
                </LocationTrackingProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
