import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze-photo/route";
import { postRequest, stubFetch, type RequestBody } from "./helpers";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

// Contract tests for POST /api/analyze-photo: the status and body returned
// for a given request, and what reaches the AI.

const AI_DESCRIPTION = "A deep cut above the left eyebrow.";

// The first bytes of a JPEG (FF D8 FF E0), base64-encoded.
const TINY_JPEG_BASE64 = "/9j/4AAQSkZJRgABAQ==";

// The first bytes of a PNG (89 50 4E 47 0D 0A 1A 0A, then the IHDR chunk).
const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUg==";

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff, 0xe0];

/** Base64 of a file of the given size that starts with the given bytes. */
function base64File(leadingBytes: number[], sizeInBytes: number): string {
  const file = Buffer.alloc(sizeInBytes);
  file.set(leadingBytes);
  return file.toString("base64");
}

function analyzePhoto(body: RequestBody, headers?: Record<string, string>) {
  return POST(postRequest("/api/analyze-photo", body, headers));
}

/**
 * Stubs the AI to answer every request with the given description. Returns
 * the image URLs it was sent, one per request.
 */
function stubAI(description: string): string[] {
  const imageUrls: string[] = [];
  stubFetch({
    [OPENAI_CHAT_URL]: async (request) => {
      imageUrls.push(imageUrlIn(await request.json()));
      return Response.json({
        choices: [{ message: { content: description } }],
      });
    },
  });
  return imageUrls;
}

/** The image URL in an OpenAI chat request body. */
function imageUrlIn(chatRequest: {
  messages: Array<{ content: unknown }>;
}): string {
  const parts = chatRequest.messages.flatMap((message) =>
    Array.isArray(message.content) ? message.content : []
  );
  const imagePart = parts.find((part) => part.type === "image_url");
  return imagePart?.image_url?.url;
}

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
  stubFetch(); // no responders: any outbound call fails the test
});

describe("POST /api/analyze-photo", () => {
  it("returns 400 for a body that isn't JSON", async () => {
    const response = await analyzePhoto({ raw: "not json" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
  });

  it.each([
    ["missing", {}],
    ["a number", { image: 12345 }],
    ["an object", { image: { data: "aGVsbG8=" } }],
  ])("returns 400 when image is %s", async (_label, json) => {
    const response = await analyzePhoto({ json });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
  });

  it("returns 413 for an image over 1.5 MB, without calling the AI", async () => {
    const aiImageUrls = stubAI(AI_DESCRIPTION);
    const image = base64File(JPEG_SIGNATURE, 1_501_000);

    const response = await analyzePhoto({ json: { image } });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(aiImageUrls).toEqual([]);
  });

  it("accepts an image just under 1.5 MB", async () => {
    stubAI(AI_DESCRIPTION);
    const image = base64File(JPEG_SIGNATURE, 1_499_000);

    const response = await analyzePhoto({ json: { image } });

    expect(response.status).toBe(200);
  });

  it.each([
    ["a GIF", Buffer.from("GIF89a\x01\x00\x01\x00").toString("base64")],
    ["a PDF", Buffer.from("%PDF-1.7\n").toString("base64")],
    ["plain text", Buffer.from("hello, world").toString("base64")],
    ["not base64", "this is not base64!"],
  ])("returns 415 for %s, without calling the AI", async (_label, image) => {
    const aiImageUrls = stubAI(AI_DESCRIPTION);

    const response = await analyzePhoto({ json: { image } });

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(aiImageUrls).toEqual([]);
  });

  it("returns 500 when no OpenAI key is configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", undefined);

    const response = await analyzePhoto({ json: { image: TINY_JPEG_BASE64 } });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: expect.any(String) });
  });

  it.each([
    ["JPEG", "image/jpeg", TINY_JPEG_BASE64],
    ["PNG", "image/png", TINY_PNG_BASE64],
  ])(
    "returns 200 with the AI's description of a %s, sent to it as %s",
    async (_label, mimeType, image) => {
      const aiImageUrls = stubAI(AI_DESCRIPTION);

      const response = await analyzePhoto({ json: { image } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        description: AI_DESCRIPTION,
      });
      expect(aiImageUrls).toEqual([`data:${mimeType};base64,${image}`]);
    }
  );

  it.each([
    ["data:image/jpeg;base64,"],
    ["data:image/png;base64,"], // mislabelled: the bytes decide the type
  ])("accepts an image with a leading %s prefix", async (prefix) => {
    const aiImageUrls = stubAI(AI_DESCRIPTION);

    const response = await analyzePhoto({
      json: { image: prefix + TINY_JPEG_BASE64 },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      description: AI_DESCRIPTION,
    });
    expect(aiImageUrls).toEqual([`data:image/jpeg;base64,${TINY_JPEG_BASE64}`]);
  });

  it.each([
    ["empty content", { choices: [{ message: { content: "" } }] }],
    ["no choices", { choices: [] }],
  ])("returns 502 when the AI response has %s", async (_label, aiBody) => {
    stubFetch({ [OPENAI_CHAT_URL]: () => Response.json(aiBody) });

    const response = await analyzePhoto({ json: { image: TINY_JPEG_BASE64 } });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: expect.any(String) });
  });
});
