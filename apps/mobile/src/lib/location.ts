import * as Location from "expo-location";

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface QuickPosition extends Coords {
  /** True when this came from the OS cache and should be refined with a fresh fix */
  approximate: boolean;
}

// A cached fix older than this is too stale to send someone to
const MAX_LAST_KNOWN_AGE_MS = 5 * 60 * 1000;
const FRESH_FIX_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function ensureLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.granted;
}

/** A fresh GPS fix, or null if none arrives in time */
export async function getFreshPosition(): Promise<Coords | null> {
  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      FRESH_FIX_TIMEOUT_MS
    );
    return position
      ? {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
      : null;
  } catch (err) {
    console.log("Fresh location fetch failed:", err);
    return null;
  }
}

/**
 * The fastest trustworthy position: a recent cached fix if the OS has one,
 * otherwise a fresh fix. Returns null when there is no position at all, so
 * callers never send a fake 0,0.
 */
export async function getQuickPosition(): Promise<QuickPosition | null> {
  try {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: MAX_LAST_KNOWN_AGE_MS,
    });
    if (lastKnown) {
      return {
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude,
        approximate: true,
      };
    }
  } catch (err) {
    console.log("Last known location unavailable:", err);
  }

  const fresh = await getFreshPosition();
  return fresh ? { ...fresh, approximate: false } : null;
}

/** "Street City Region", or undefined if reverse geocoding fails */
export async function describeLocation(
  coords: Coords
): Promise<string | undefined> {
  try {
    const [address] = await Location.reverseGeocodeAsync(coords);
    if (!address) return undefined;
    const name = [address.street, address.city, address.region]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || undefined;
  } catch (err) {
    console.log("Reverse geocoding failed:", err);
    return undefined;
  }
}

/** Distance in meters between two points (haversine) */
export function distanceMeters(a: Coords, b: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}
