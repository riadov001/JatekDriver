import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { storage } from "@/lib/storage";

import {
  ApiError,
  customFetch,
  type AuthResponse,
  type Driver,
  type User,
} from "@workspace/api-client-react";

const TOKEN_KEY = "jatek_driver_token";
const DRIVER_ID_KEY = "jatek_driver_id";

interface AuthContextValue {
  token: string | null;
  user: User | null;
  driver: Driver | null;
  driverId: number | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshDriver: () => Promise<Driver | null>;
  hydrate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<User> {
  return customFetch<User>("/api/auth/me", { method: "GET" });
}

async function fetchMyDriver(): Promise<Driver> {
  return customFetch<Driver>("/api/drivers/me", { method: "GET" });
}

async function postLogin(email: string, password: string): Promise<AuthResponse> {
  return customFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const hydrate = useCallback(async () => {
    try {
      const stored = await storage.getItemAsync(TOKEN_KEY);
      if (!stored) {
        setLoading(false);
        return;
      }
      setToken(stored);
      try {
        const me = await fetchMe();
        setUser(me);
        try {
          const drv = await fetchMyDriver();
          setDriver(drv);
          await storage.setItemAsync(DRIVER_ID_KEY, String(drv.id));
        } catch {
          // Driver profile may not be ready — clear stale driver state but keep session
          setDriver(null);
          await storage.deleteItemAsync(DRIVER_ID_KEY);
        }
      } catch (err) {
        // Only invalidate the token for explicit auth rejections (401/403).
        // Network errors, timeouts, and server errors (5xx) must NOT log the
        // user out — the token is still valid and will work once connectivity
        // is restored.
        const isAuthError =
          err instanceof ApiError && (err.status === 401 || err.status === 403);
        if (isAuthError) {
          await storage.deleteItemAsync(TOKEN_KEY);
          await storage.deleteItemAsync(DRIVER_ID_KEY);
          setToken(null);
          setUser(null);
          setDriver(null);
        }
        // On non-auth errors: keep the stored token and stay "logged in" with
        // no user/driver data; screens will refetch when connectivity returns.
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await postLogin(email, password);
    if (res.user.role !== "driver") {
      throw new Error("Ce compte n'est pas un compte livreur");
    }
    await storage.setItemAsync(TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
    // Prefer driver embedded in login response (avoids /api/drivers/me call)
    if (res.driver) {
      setDriver(res.driver);
      await storage.setItemAsync(DRIVER_ID_KEY, String(res.driver.id));
    } else {
      try {
        const drv = await fetchMyDriver();
        setDriver(drv);
        await storage.setItemAsync(DRIVER_ID_KEY, String(drv.id));
      } catch {
        // Driver profile may not be ready yet — will be loaded on hydration
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await storage.deleteItemAsync(TOKEN_KEY);
    await storage.deleteItemAsync(DRIVER_ID_KEY);
    setToken(null);
    setUser(null);
    setDriver(null);
  }, []);

  const refreshDriver = useCallback(async (): Promise<Driver | null> => {
    if (!token) return null;
    try {
      const drv = await fetchMyDriver();
      setDriver(drv);
      return drv;
    } catch {
      return null;
    }
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      driver,
      driverId: driver?.id ?? null,
      loading,
      login,
      logout,
      refreshDriver,
      hydrate,
    }),
    [token, user, driver, loading, login, logout, refreshDriver, hydrate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
