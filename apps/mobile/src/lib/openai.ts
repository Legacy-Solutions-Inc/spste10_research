/**
 * Emergency photo analysis via AGAP API (server-side OpenAI proxy).
 * The API key is never exposed to the client.
 */

import Constants from "expo-constants";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { supabase } from "./supabase";

export const getApiOrigin = (): string => {
  return (
    process.env.EXPO_PUBLIC_API_ORIGIN ||
    Constants.expoConfig?.extra?.apiOrigin ||
    "https://agap-responders.vercel.app"
  );
};

// The copy of the photo sent for a description: at most 1024 px wide, as a
// JPEG at 70% quality (typically 150-300 KB). The photo stored with the
// Report is uploaded separately and keeps its full quality.
const DESCRIPTION_PHOTO_MAX_WIDTH = 1024;
const DESCRIPTION_PHOTO_JPEG_QUALITY = 0.7;

/**
 * Makes a small JPEG copy of a photo and returns it as base64. The photo is
 * downsampled while it is decoded, so a high-resolution capture is never
 * loaded into memory at full size, and the base64 is encoded natively.
 * @param imageUri - Local file URI from camera
 * @returns Base64 encoded JPEG of the resized copy
 */
async function resizeToJpegBase64(imageUri: string): Promise<string> {
  try {
    const image = await ImageManipulator.manipulate(imageUri, {
      maxWidth: DESCRIPTION_PHOTO_MAX_WIDTH,
    }).renderAsync();
    const { base64 } = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: DESCRIPTION_PHOTO_JPEG_QUALITY,
      base64: true,
    });
    if (!base64) {
      throw new Error("The image manipulator returned no base64 data");
    }
    return base64;
  } catch (error) {
    console.error("[OpenAI] Error resizing image:", error);
    throw new Error("Failed to process image");
  }
}

/**
 * Analyze an emergency photo via the AGAP API (proxies to OpenAI Vision).
 * Sends a resized JPEG copy; the original photo isn't modified. The API only
 * describes photos for signed-in users, within a quota, so this sends the
 * current session's access token. The error messages are for logs only.
 * @param imageUri - Local file URI of the photo to analyze
 * @returns Generated description of the emergency situation
 */
export async function analyzeEmergencyPhoto(imageUri: string): Promise<string> {
  const apiOrigin = getApiOrigin();

  try {
    const session = supabase
      ? (await supabase.auth.getSession()).data.session
      : null;
    if (!session?.access_token) {
      throw new Error("Not signed in");
    }

    const base64Image = await resizeToJpegBase64(imageUri);

    const url = `${apiOrigin.replace(/\/$/, "")}/api/analyze-photo`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Not signed in");
      }
      if (response.status === 429) {
        throw new Error("Photo descriptions are paused for a while");
      }
      throw new Error(`Photo description failed (HTTP ${response.status})`);
    }

    const data = (await response.json().catch(() => ({}))) as {
      description?: string;
    };

    const description = data?.description?.trim();
    if (!description) {
      console.error("[OpenAI] Unexpected API response format:", data);
      throw new Error("Invalid response from AI service");
    }

    return description;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    console.error("[OpenAI] Error analyzing photo:", error);
    throw new Error(
      "Failed to analyze photo. Please check your internet connection and try again."
    );
  }
}

/**
 * Check if the analyze-photo API is configured
 * @returns true if API origin is available
 */
export function isOpenAIConfigured(): boolean {
  return true;
}
