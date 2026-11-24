/**
 * API route to proxy OpenAI Vision requests.
 * Keeps the API key server-side (never exposed to client).
 * See: https://docs.expo.dev/router/web/api-routes/
 */

import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an emergency medical responder analyzing a photo of an emergency situation. Your task is to provide a clear, professional description that will help first responders understand the situation quickly.

Guidelines for your analysis:
1. **Medical/Emergency Focus**: Describe visible injuries, symptoms, or emergency conditions using appropriate medical terminology when relevant, but keep it accessible.

2. **Location & Context**: Clearly identify where the injury or emergency is located (e.g., "right side of forehead", "left arm", "vehicle interior", "roadside").

3. **Severity Assessment**: Note the apparent severity if visible (e.g., "significant bleeding", "minor abrasion", "visible swelling"). Be factual and avoid speculation.

4. **Visible Details**: Describe what you can actually see:
   - Type and location of injury
   - Visible symptoms (bleeding, swelling, discoloration, etc.)
   - Environmental context (indoor/outdoor, vehicle, building, etc.)
   - Position of the person/object in the scene

5. **Actionable Information**: Focus on details that help responders prepare:
   - Approximate size/area of injury
   - Direction of bleeding or flow
   - Visible foreign objects or debris
   - Safety concerns in the environment

6. **Tone & Length**:
   - Professional and factual
   - Concise but comprehensive (2-4 sentences, approximately 100-200 words)
   - Avoid speculation or assumptions beyond what is visible

7. **Privacy & Sensitivity**: Describe the medical/emergency situation factually without unnecessary personal details.`;

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

export async function POST(request: NextRequest) {
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

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
      return NextResponse.json(
        { error: message },
        { status: response.status }
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "Invalid response from AI service" },
        { status: 502 }
      );
    }

    return NextResponse.json({ description: content });
  } catch (error) {
    console.error("[API analyze-photo] Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze photo" },
      { status: 500 }
    );
  }
}
