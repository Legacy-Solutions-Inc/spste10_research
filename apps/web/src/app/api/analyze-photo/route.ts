/**
 * API route to proxy OpenAI Vision requests.
 * Keeps the API key server-side (never exposed to client).
 * Only signed-in app users can use it, within the quota that the database
 * function claim_photo_analysis() enforces.
 * See: https://docs.expo.dev/router/web/api-routes/
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Run time asked of the host, in seconds: the AI timeout plus headroom, so a
// slow but successful AI call isn't cut off by the default limit.
export const maxDuration = 30;

// How long to wait for the AI before cancelling the request.
const AI_TIMEOUT_MS = 25_000;

// The Authorization header a signed-in caller sends: their Supabase access token.
const BEARER_AUTHORIZATION = /^Bearer\s+\S+$/i;

// How long a caller over a quota limit is asked to wait: the per-person window.
const QUOTA_RETRY_AFTER_SECONDS = 3600;

// The answers claim_photo_analysis() can give.
const QUOTA_ANSWERS = [
  "ok",
  "unauthenticated",
  "user_limit",
  "daily_limit",
] as const;

type QuotaAnswer = (typeof QUOTA_ANSWERS)[number];

const SYSTEM_PROMPT = `You are an emergency medical responder analyzing a photo of an emergency situation. Your task is to provide a clear, professional description that will help first responders understand the situation quickly.

Guidelines for your analysis:
1. **Medical/Emergency Focus**: Describe visible injuries, symptoms, or emergency conditions using appropriate medical terminology when relevant, but keep it accessible.

2. **Location & Context**: Clearly identify where the injury or emergency is located (e.g., "forehead", "lower leg", "vehicle interior", "roadside"). For any body part with a side, follow the Body Side guideline below.

3. **Body Side**: For every body part with a side (arms, legs, hands, feet, eyes, ears, and sides of the head, chest or torso), give left and right as the injured person's own left and right, never as they appear in the image. A person facing the camera has their left side on the right of the image. Name a side only when the photo shows which way the person is facing, for example when their face or the front of their body is visible and the injured part is clearly attached to it. Otherwise say the side can't be told from the photo, for example "deep cut on one forearm; which arm can't be told from the photo". If both sides are injured, say both.

4. **Severity Assessment**: Note the apparent severity if visible (e.g., "significant bleeding", "minor abrasion", "visible swelling"). Be factual and avoid speculation.

5. **Visible Details**: Describe what you can actually see:
   - Type and location of injury
   - Visible symptoms (bleeding, swelling, discoloration, etc.)
   - Environmental context (indoor/outdoor, vehicle, building, etc.)
   - Position of the person/object in the scene

6. **Actionable Information**: Focus on details that help responders prepare:
   - Approximate size/area of injury
   - Direction of bleeding or flow
   - Visible foreign objects or debris
   - Safety concerns in the environment

7. **Tone & Length**:
   - Professional and factual
   - Concise but comprehensive (2-4 sentences, approximately 100-200 words)
   - Avoid speculation or assumptions beyond what is visible

8. **Privacy & Sensitivity**: Describe the medical/emergency situation factually without unnecessary personal details.`;

const USER_PROMPT = `Please analyze this emergency photo and provide a professional description that will help first responders understand the situation. Focus on visible injuries, symptoms, location, severity, and environmental context. Keep the description concise (2-4 sentences, 100-200 words) and use appropriate medical/emergency terminology.`;

// An optional "data:<type>;base64," prefix on the image, as in a data URL.
const DATA_URL_PREFIX = /^data:[^,]*;base64,/;

// Largest image accepted, in base64 characters: about 1.5 MB once decoded.
// The app sends a resized copy, well under this limit.
const MAX_IMAGE_BASE64_LENGTH = 2_000_000;

// The image types accepted, by the bytes each file format starts with.
const IMAGE_SIGNATURES = [
  { mimeType: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  {
    mimeType: "image/png",
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
] as const;

type ImageMimeType = (typeof IMAGE_SIGNATURES)[number]["mimeType"];

/** The JPEG or PNG mime type of base64 image data, judged by its first bytes. */
function detectImageType(base64Image: string): ImageMimeType | null {
  let leadingBytes: string;
  try {
    // 12 base64 characters decode to 9 bytes, enough for every signature.
    leadingBytes = atob(base64Image.slice(0, 12));
  } catch {
    return null;
  }
  const match = IMAGE_SIGNATURES.find(({ bytes }) =>
    bytes.every((byte, i) => leadingBytes.charCodeAt(i) === byte)
  );
  return match?.mimeType ?? null;
}

/**
 * The response when the AI returns an error status, can't be reached or
 * times out. It never includes the provider's own error text; the caller logs
 * the detail for the server logs instead.
 */
function aiCallFailed() {
  return NextResponse.json(
    { error: "AI service unavailable" },
    { status: 502 }
  );
}

/** The response when the caller has no valid session. */
function signInRequired() {
  return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
}

/**
 * Claims one photo description from the caller's quota, acting as the caller.
 * The database API rejects a forged or expired token before the quota function
 * runs, so a rejected token counts as "unauthenticated". Returns null if the
 * quota couldn't be checked. Never logs the token.
 */
async function claimPhotoAnalysis(
  authorization: string
): Promise<QuotaAnswer | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
    // @ts-ignore - RPC isn't in the generated types
    const { data, error, status } = await supabase.rpc("claim_photo_analysis");
    if (status === 401) {
      console.warn(
        `[API analyze-photo] Quota check rejected the token: ${error?.message}`
      );
      return "unauthenticated";
    }
    if (error) {
      console.error(
        `[API analyze-photo] Quota check failed (${status}): ${error.message}`
      );
      return null;
    }
    if (!QUOTA_ANSWERS.includes(data)) {
      console.error(
        `[API analyze-photo] Quota check gave an unexpected answer: ${JSON.stringify(data)}`
      );
      return null;
    }
    return data;
  } catch (error) {
    console.error("[API analyze-photo] Quota check failed:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("Authorization");
  if (!authorization || !BEARER_AUTHORIZATION.test(authorization)) {
    return signInRequired();
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  let body: { image?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const image = body?.image;
  if (!image || typeof image !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'image' field (base64 string)" },
      { status: 400 }
    );
  }
  const base64Image = image.replace(DATA_URL_PREFIX, "");

  if (base64Image.length > MAX_IMAGE_BASE64_LENGTH) {
    return NextResponse.json({ error: "Image is too large" }, { status: 413 });
  }

  const mimeType = detectImageType(base64Image);
  if (!mimeType) {
    return NextResponse.json(
      { error: "Image must be a JPEG or PNG" },
      { status: 415 }
    );
  }

  // Checked after validation, so malformed requests never use up quota. If
  // the quota can't be checked, no AI call is made.
  const quota = await claimPhotoAnalysis(authorization);
  if (quota === "unauthenticated") {
    return signInRequired();
  }
  if (quota === "user_limit" || quota === "daily_limit") {
    return NextResponse.json(
      { error: "Too many photo descriptions; try again later" },
      {
        status: 429,
        headers: { "Retry-After": String(QUOTA_RETRY_AFTER_SECONDS) },
      }
    );
  }
  if (quota !== "ok") {
    return NextResponse.json(
      { error: "Photo descriptions are temporarily unavailable" },
      { status: 503 }
    );
  }

  // The fetch rejects with this abort reason, so the log says why it failed.
  const aiRequest = new AbortController();
  const aiTimeout = setTimeout(
    () =>
      aiRequest.abort(
        new DOMException(
          `No answer from the AI within ${AI_TIMEOUT_MS / 1000} seconds`,
          "TimeoutError"
        )
      ),
    AI_TIMEOUT_MS
  );

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      signal: aiRequest.signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: USER_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message =
        (errData as { error?: { message?: string } })?.error?.message ||
        response.statusText;
      console.error(
        `[API analyze-photo] AI provider returned ${response.status}: ${message}`
      );
      return aiCallFailed();
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      console.error("[API analyze-photo] AI response had no description");
      return NextResponse.json(
        { error: "Invalid response from AI service" },
        { status: 502 }
      );
    }

    return NextResponse.json({ description: content });
  } catch (error) {
    console.error("[API analyze-photo] AI request failed:", error);
    return aiCallFailed();
  } finally {
    clearTimeout(aiTimeout);
  }
}
