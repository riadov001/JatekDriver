import Constants from "expo-constants";
import { useCallback, useEffect, useRef, useState } from "react";

interface LatLng {
  latitude: number;
  longitude: number;
}

interface DirectionsResult {
  polyline: LatLng[];
  distanceText: string;
  durationText: string;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const geocodeCache = new Map<string, LatLng | null>();

const API_KEY: string =
  (Constants.expoConfig?.extra?.googleMapsApiKey as string) ?? "";

async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address)!;
  if (!API_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === "OK" && json.results.length > 0) {
      const loc = json.results[0].geometry.location;
      const coords: LatLng = { latitude: loc.lat, longitude: loc.lng };
      geocodeCache.set(address, coords);
      return coords;
    }
    geocodeCache.set(address, null);
    return null;
  } catch {
    return null;
  }
}

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c =
    sinLat * sinLat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

function decodePolyline(encoded: string): LatLng[] {
  const coords: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
}

export function useDirections(
  driverCoords: LatLng | null,
  restaurantAddress: string | undefined,
  deliveryAddress: string | undefined,
): DirectionsResult {
  const [polyline, setPolyline] = useState<LatLng[]>([]);
  const [distanceText, setDistanceText] = useState("");
  const [durationText, setDurationText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastDriverRef = useRef<LatLng | null>(null);
  const fetchCountRef = useRef(0);

  const fetchDirections = useCallback(async (driver: LatLng, restAddr: string, delivAddr: string) => {
    if (!API_KEY) return;
    setLoading(true);
    setError(null);
    try {
      const [restCoords, delivCoords] = await Promise.all([
        geocodeAddress(restAddr),
        geocodeAddress(delivAddr),
      ]);

      if (!restCoords || !delivCoords) {
        setError("Impossible de géocoder les adresses");
        return;
      }

      const origin = `${driver.latitude},${driver.longitude}`;
      const waypoint = `${restCoords.latitude},${restCoords.longitude}`;
      const destination = `${delivCoords.latitude},${delivCoords.longitude}`;
      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${origin}` +
        `&destination=${destination}` +
        `&waypoints=${waypoint}` +
        `&mode=driving` +
        `&language=fr` +
        `&key=${API_KEY}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.status !== "OK" || !json.routes.length) {
        setError("Directions non disponibles");
        return;
      }

      const route = json.routes[0];
      const encodedPoly = route.overview_polyline.points;
      setPolyline(decodePolyline(encodedPoly));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const legs: any[] = route.legs ?? [];
      const totalDist: number = legs.reduce((s: number, l: any) => s + (l.distance?.value ?? 0), 0);
      const totalDur: number = legs.reduce((s: number, l: any) => s + (l.duration?.value ?? 0), 0);

      const km = (totalDist / 1000).toFixed(1);
      const mins = Math.round(totalDur / 60);
      setDistanceText(`${km} km`);
      setDurationText(`${mins} min`);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (!driverCoords || !restaurantAddress || !deliveryAddress) return;
    fetchCountRef.current += 1;
    fetchDirections(driverCoords, restaurantAddress, deliveryAddress);
  }, [driverCoords, restaurantAddress, deliveryAddress, fetchDirections]);

  useEffect(() => {
    if (!driverCoords || !restaurantAddress || !deliveryAddress) return;
    const prev = lastDriverRef.current;
    const moved = !prev || haversineMeters(prev, driverCoords) > 50;
    if (!moved && polyline.length > 0) return;
    lastDriverRef.current = driverCoords;
    fetchDirections(driverCoords, restaurantAddress, deliveryAddress);
  }, [driverCoords, restaurantAddress, deliveryAddress, fetchDirections, polyline.length]);

  useEffect(() => {
    if (!driverCoords || !restaurantAddress || !deliveryAddress) return;
    const id = setInterval(() => {
      fetchDirections(driverCoords, restaurantAddress, deliveryAddress);
    }, 10000);
    return () => clearInterval(id);
  }, [driverCoords, restaurantAddress, deliveryAddress, fetchDirections]);

  return { polyline, distanceText, durationText, loading, error, refetch };
}
