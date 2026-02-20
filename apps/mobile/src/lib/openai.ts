/**
 * Emergency photo analysis via AGAP API (server-side OpenAI proxy).
 * The API key is never exposed to the client.
 */

import Constants from "expo-constants";

const getApiOrigin = (): string => {
  return (
    process.env.EXPO_PUBLIC_API_ORIGIN ||
    Constants.expoConfig?.extra?.apiOrigin ||
    "https://agap-responders.vercel.app"
  );
};

/**
 * Convert image URI to base64 string
 * @param imageUri - Local file URI from camera
 * @returns Base64 encoded image string
 */
async function imageUriToBase64(imageUri: string): Promise<string> {
  try {
    const response = await fetch(imageUri);

    let arrayBuffer: ArrayBuffer;
    if (typeof response.arrayBuffer === "function") {
      arrayBuffer = await response.arrayBuffer();
    } else {
      arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", imageUri, true);
        xhr.responseType = "arraybuffer";
        xhr.onload = () =>
          xhr.status === 200
            ? resolve(xhr.response)
            : reject(new Error(`Failed to load file: ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Network error loading file"));
        xhr.send();
      });
    }

    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error("[OpenAI] Error converting image to base64:", error);
    throw new Error("Failed to process image");
  }
}

/**
 * Analyze an emergency photo via the AGAP API (proxies to OpenAI Vision)
 * @param imageUri - Local file URI of the photo to analyze
 * @returns Generated description of the emergency situation
 */
export async function analyzeEmergencyPhoto(imageUri: string): Promise<string> {
  const apiOrigin = getApiOrigin();

  try {
    const base64Image = await imageUriToBase64(imageUri);

    const url = `${apiOrigin.replace(/\/$/, "")}/api/analyze-photo`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: base64Image }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      description?: string;
      error?: string;
    };

    if (!response.ok) {
      const message = data?.error || response.statusText;
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Invalid API key. Please check your OpenAI API key configuration."
        );
      }
      if (response.status === 429) {
        throw new Error("API rate limit exceeded. Please try again in a moment.");
      }
      throw new Error(message || `API request failed: ${response.statusText}`);
    }

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
