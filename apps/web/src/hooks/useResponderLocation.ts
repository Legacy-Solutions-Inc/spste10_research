"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import { geocodeAddress, buildAddressString } from "@/lib/geocoding";

// Default Iloilo coordinates as fallback
const DEFAULT_CENTER: [number, number] = [10.7202, 122.5621];

interface ResponderLocation {
  coordinates: [number, number];
  /** True once the office address was geocoded; otherwise coordinates are the Iloilo fallback. */
  located: boolean;
  /** Located from municipality + province only, because the street address wasn't found */
  approximate: boolean;
  address: string | null;
  loading: boolean;
  error: string | null;
}

export function useResponderLocation(): ResponderLocation {
  const [coordinates, setCoordinates] = useState<[number, number]>(DEFAULT_CENTER);
  const [address, setAddress] = useState<string | null>(null);
  const [located, setLocated] = useState(false);
  const [approximate, setApproximate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResponderLocation = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("User not authenticated");
          setLoading(false);
          return;
        }

        // Fetch responder profile
        // @ts-ignore - Supabase types may not be fully generated
        const { data: responderProfileRaw, error: profileError } = await supabase
          .from("responder_profiles")
          .select("office_address, municipality, province")
          .eq("id", user.id)
          .single();

        if (profileError) {
          // Not an error - responder might not have profile yet
          setLoading(false);
          return;
        }

        // Type assertion for responder profile data
        type ResponderProfileData = {
          office_address: string | null;
          municipality: string | null;
          province: string | null;
        } | null;

        const responderProfile = responderProfileRaw as ResponderProfileData;

        if (!responderProfile) {
          setLoading(false);
          return;
        }

        // Build address string from profile data

        const addressString = buildAddressString(
          responderProfile.office_address,
          responderProfile.municipality,
          responderProfile.province
        );

        if (!addressString) {
          setLoading(false);
          return;
        }

        setAddress(addressString);

        // Geocode the address; free-form street addresses often miss, so fall back to the town
        let geocodeResult = await geocodeAddress(addressString);
        if (!geocodeResult && responderProfile.office_address) {
          const townString = buildAddressString(null, responderProfile.municipality, responderProfile.province);
          geocodeResult = townString ? await geocodeAddress(townString) : null;
          if (geocodeResult) setApproximate(true);
        }

        if (geocodeResult) {
          const newCoordinates: [number, number] = [geocodeResult.latitude, geocodeResult.longitude];
          setCoordinates(newCoordinates);
          setLocated(true);
        } else {
          setError("Failed to geocode address");
          // Keep default coordinates
        }
      } catch (err) {
        console.error("[useResponderLocation] Error fetching responder location:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch responder location");
        // Keep default coordinates
      } finally {
        setLoading(false);
      }
    };

    fetchResponderLocation();
  }, []);

  return { coordinates, located, approximate, address, loading, error };
}
