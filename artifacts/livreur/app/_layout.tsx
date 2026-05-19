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
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocationTrackingProvider } from "@/contexts/LocationTrackingContext";
import { useColors } from "@/hooks/useColors";
import { storage } from "@/lib/storage";

const REMOTE_CONFIG_CACHE_KEY = "jatek_remote_config";

/**
 * Bootstrap URL — used to fetch the remote config on first launch.
 * Priority: EXPO_PUBLIC_API_URL > EXPO_PUBLIC_API_DOMAIN > hardcoded Replit URL.
 */
const BOOTSTRAP_URL = process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, "")
  : process.env.EXPO_PUBLIC_API_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
    : "https://jatek-app-rbe-26-dekivery-18--delivery18.replit.app";

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

async function loadRemoteConfig(): Promise<void> {
  try {
    const res = await fetch(`${BOOTSTRAP_URL}/api/remoteconfig`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const config: RemoteConfig = await res.json();
      if (config.primaryUrl) {
        setBaseUrl(config.primaryUrl.replace(/\/+$/, ""));
        await storage.setItemAsync(REMOTE_CONFIG_CACHE_KEY, JSON.stringify(config));
      }
    }
  } catch {
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
}

function RootLayoutNav() {
  const colors = useColors();
  return (
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
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const remoteConfigLoaded = useRef(false);

  useEffect(() => {
    if (!remoteConfigLoaded.current) {
      remoteConfigLoaded.current = true;
      loadRemoteConfig();
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <LocationTrackingProvider>
                  <RootLayoutNav />
                </LocationTrackingProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
