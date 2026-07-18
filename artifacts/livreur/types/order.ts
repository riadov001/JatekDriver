/**
 * Order state machine types.
 * Every delivery follows a strict, linear workflow — no state can be skipped.
 */

export type OrderMachineState =
  | "OFFLINE"
  | "WAITING_ORDER"
  | "NEW_ORDER"
  | "ACCEPTED"
  | "NAVIGATE_TO_PICKUP"
  | "ARRIVED_PICKUP"
  | "PICKUP_CONFIRMED"
  | "NAVIGATE_TO_CUSTOMER"
  | "ARRIVED_DESTINATION"
  | "DELIVERED"
  | "CANCELLED";

/**
 * Maps API order status strings to machine states.
 * When the driver app receives a status from the backend, convert it here.
 */
export const API_STATUS_TO_MACHINE: Record<string, OrderMachineState> = {
  pending:   "WAITING_ORDER",
  accepted:  "ACCEPTED",
  preparing: "ACCEPTED",
  ready:     "NAVIGATE_TO_PICKUP",
  picked_up: "PICKUP_CONFIRMED",
  en_route:  "NAVIGATE_TO_CUSTOMER",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
};

/** Valid transitions — the machine enforces these */
export const VALID_TRANSITIONS: Record<OrderMachineState, OrderMachineState[]> = {
  OFFLINE:              ["WAITING_ORDER"],
  WAITING_ORDER:        ["NEW_ORDER", "OFFLINE"],
  NEW_ORDER:            ["ACCEPTED", "WAITING_ORDER"],
  ACCEPTED:             ["NAVIGATE_TO_PICKUP", "CANCELLED"],
  NAVIGATE_TO_PICKUP:   ["ARRIVED_PICKUP", "CANCELLED"],
  ARRIVED_PICKUP:       ["PICKUP_CONFIRMED", "CANCELLED"],
  PICKUP_CONFIRMED:     ["NAVIGATE_TO_CUSTOMER"],
  NAVIGATE_TO_CUSTOMER: ["ARRIVED_DESTINATION"],
  ARRIVED_DESTINATION:  ["DELIVERED"],
  DELIVERED:            ["WAITING_ORDER"],
  CANCELLED:            ["WAITING_ORDER"],
};

/** Reasons a driver can decline a new order */
export type DeclineReason =
  | "TOO_FAR"
  | "VEHICLE_ISSUE"
  | "PERSONAL"
  | "TRAFFIC"
  | "OTHER";

export const DECLINE_REASON_LABELS: Record<DeclineReason, string> = {
  TOO_FAR:       "Trop loin",
  VEHICLE_ISSUE: "Problème de véhicule",
  PERSONAL:      "Problème personnel",
  TRAFFIC:       "Trafic important",
  OTHER:         "Autre raison",
};
