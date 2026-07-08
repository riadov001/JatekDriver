import { useEffect, useRef } from "react";

const API_BASE = (import.meta.env.VITE_API_URL ?? "")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

function getToken(): string | null {
  return localStorage.getItem("jatek_backend_token");
}

function getApiBase(): string {
  if (API_BASE) return API_BASE;
  return window.location.origin;
}

/**
 * Subscribes to the admin_tracking SSE channel and fires browser
 * Notification toasts for key order events (new order, status changes).
 *
 * Automatically requests browser notification permission on mount.
 * Safe to call even when the browser doesn't support notifications.
 */
export function useAdminNotifications() {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!("Notification" in window)) return;

    Notification.requestPermission();

    function connect() {
      const token = getToken();
      if (!token) return;

      const url = `${getApiBase()}/api/events?channels=admin_tracking&token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("order_new", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (Notification.permission === "granted") {
            new Notification("🛎 Nouvelle commande", {
              body: `#${data.reference ?? data.id} — ${data.restaurantName ?? ""} — ${Number(data.total ?? 0).toFixed(0)} DH`,
              icon: "/favicon.ico",
              tag: `order-new-${data.id}`,
            });
          }
        } catch {}
      });

      es.addEventListener("order_status", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          const labels: Record<string, string> = {
            accepted: "✅ Commande acceptée",
            preparing: "👨‍🍳 En préparation",
            ready: "📦 Prête pour livraison",
            picked_up: "🛵 Récupérée par le livreur",
            delivered: "🎉 Livrée",
            cancelled: "❌ Annulée",
          };
          const title = labels[data.status];
          if (title && Notification.permission === "granted") {
            new Notification(title, {
              body: `Commande #${data.orderId}`,
              icon: "/favicon.ico",
              tag: `order-status-${data.orderId}-${data.status}`,
            });
          }
        } catch {}
      });

      es.onerror = () => {
        es.close();
        setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);
}
