/**
 * Delivery ETA estimation — Moroccan urban market.
 *
 * Three-leg model:
 *   1. Driver → Restaurant  : Haversine distance at 25 km/h (urban scooter)
 *   2. Kitchen preparation  : restaurant.deliveryTime column, default 20 min
 *   3. Restaurant → Customer: flat 15 min (no customer geocode available)
 *
 * Returns estimated minutes from now until delivery, clamped to [10, 90].
 */

const DRIVER_SPEED_KMH = 25;
const DEFAULT_PREP_MIN = 20;
const LAST_MILE_MIN = 15;

export function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface EtaOptions {
  driverLat?: number | null;
  driverLon?: number | null;
  restaurantLat?: number | null;
  restaurantLon?: number | null;
  /** restaurant.deliveryTime column (minutes). */
  restaurantPrepTime?: number | null;
}

export function estimateDeliveryMinutes(opts: EtaOptions): number {
  let pickupMin = 0;
  if (opts.driverLat && opts.driverLon && opts.restaurantLat && opts.restaurantLon) {
    const distKm = haversineKm(opts.driverLat, opts.driverLon, opts.restaurantLat, opts.restaurantLon);
    pickupMin = (distKm / DRIVER_SPEED_KMH) * 60;
  }
  const prepMin = opts.restaurantPrepTime ?? DEFAULT_PREP_MIN;
  return Math.max(10, Math.min(90, Math.ceil(pickupMin + prepMin + LAST_MILE_MIN)));
}
