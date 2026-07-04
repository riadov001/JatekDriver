export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  preparing: "En préparation",
  ready: "Prête",
  picked_up: "Récupérée",
  en_route: "En route",
  delivered: "Livrée",
  cancelled: "Annulée",
};

/** Ordered delivery journey steps shown on the driver's status timeline. */
export const DELIVERY_TIMELINE_STEPS = [
  { key: "picked_up", label: "Récupérée", icon: "package" as const },
  { key: "en_route", label: "En route", icon: "navigation" as const },
  { key: "delivered", label: "Livrée", icon: "check-circle" as const },
];

const STEP_ORDER: Record<string, number> = {
  accepted: 0,
  preparing: 0,
  ready: 0,
  picked_up: 1,
  en_route: 2,
  delivered: 3,
};

export function getTimelineStepIndex(status: string): number {
  return STEP_ORDER[status] ?? 0;
}
