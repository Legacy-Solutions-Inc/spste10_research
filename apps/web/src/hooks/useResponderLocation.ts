"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import { geocodeAddress, buildAddressString } from "@/lib/geocoding";

// Default Iloilo coordinates as fallback
const DEFAULT_CENTER: [number, number] = [10.7202, 122.5621];

interface ResponderLocation {
  coordinates: [number, number];
  address: string | null;
  loading: boolean;
  error: string | null;
}

export function useResponderLocation(): ResponderLocation {
  const [coordinates, setCoordinates] = useState<[number, number]>(DEFAULT_CENTER);
  const [address, setAddress] = useState<string | null>(null);
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
          console.warn("[useResponderLocation] No responder profile found:", profileError.message);
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
        console.log("[useResponderLocation] Responder profile data:", {
          office_address: responderProfile.office_address,
          municipality: responderProfile.municipality,
          province: responderProfile.province,
        });

        const addressString = buildAddressString(
          responderProfile.office_address,
          responderProfile.municipality,
          responderProfile.province
        );

        console.log("[useResponderLocation] Built address string:", addressString);

        if (!addressString) {
          console.warn("[useResponderLocation] No address data in responder profile");
          setLoading(false);
          return;
        }

        setAddress(addressString);

        // Geocode the address
        console.log(`[useResponderLocation] Starting geocoding for: ${addressString}`);
        const geocodeResult = await geocodeAddress(addressString);

        if (geocodeResult) {
          const newCoordinates: [number, number] = [geocodeResult.latitude, geocodeResult.longitude];
          setCoordinates(newCoordinates);
          console.log(
            `[useResponderLocation] Successfully geocoded address "${addressString}" to:`,
            newCoordinates
          );
        } else {
          console.warn(
            `[useResponderLocation] Failed to geocode address: ${addressString}, using default coordinates`
          );
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

  return { coordinates, address, loading, error };
}
