// Geocoding utility using OpenStreetMap Nominatim API
// Free service, no API key required, but has rate limiting

interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

// Simple in-memory cache to avoid repeated API calls
const geocodeCache = new Map<string, GeocodeResult>();

/**
 * Geocode an address to get coordinates
 * @param address - The address to geocode (e.g., "Lambunao, Iloilo, Philippines")
 * @returns Coordinates and display name, or null if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim() === "") {
    return null;
  }

  const normalizedAddress = address.trim();

  // Check cache first
  if (geocodeCache.has(normalizedAddress)) {
    return geocodeCache.get(normalizedAddress) || null;
  }

  try {
    // Use Nominatim API with proper headers
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(normalizedAddress)}&` +
      `format=json&` +
      `limit=1&` +
      `addressdetails=1`;
    
    console.log(`[geocoding] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "AGAP-WebApp/1.0", // Required by Nominatim
      },
    });

    console.log(`[geocoding] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`[geocoding] API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[geocoding] Error response body:`, errorText);
      return null;
    }

    const data = await response.json();
    console.log(`[geocoding] API returned ${Array.isArray(data) ? data.length : 0} results`);

    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`[geocoding] No results found for address: ${normalizedAddress}`);
      return null;
    }

    const result = data[0];
    const geocodeResult: GeocodeResult = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name || normalizedAddress,
    };

    // Cache the result
    geocodeCache.set(normalizedAddress, geocodeResult);

    // Add a small delay to respect rate limiting (1 request per second recommended)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return geocodeResult;
  } catch (error) {
    console.error(`[geocoding] Error geocoding address "${normalizedAddress}":`, error);
    return null;
  }
}

/**
 * Build address string from responder profile data
 * @param officeAddress - Office address (optional)
 * @param municipality - Municipality (optional)
 * @param province - Province (optional)
 * @returns Formatted address string
 */
export function buildAddressString(
  officeAddress: string | null | undefined,
  municipality: string | null | undefined,
  province: string | null | undefined
): string | null {
  const parts: string[] = [];

  if (officeAddress && officeAddress.trim()) {
    parts.push(officeAddress.trim());
  }

  if (municipality && municipality.trim()) {
    parts.push(municipality.trim());
  }

  if (province && province.trim()) {
    parts.push(province.trim());
  }

  if (parts.length === 0) {
    return null;
  }

  // Add "Philippines" for better geocoding results
  const address = parts.join(", ") + ", Philippines";
  return address;
}

/**
 * Clear the geocoding cache (useful for testing or when addresses are updated)
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}
