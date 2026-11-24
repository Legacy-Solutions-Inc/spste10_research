import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze-photo/route";
import { postRequest, stubFetch, type RequestBody } from "./helpers";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

// Characterization tests: they pin down how POST /api/analyze-photo behaves
// today, before the photo-analysis-auth work changes it.

// The first bytes of a JPEG (FF D8 FF E0), base64-encoded.
const TINY_JPEG_BASE64 = "/9j/4AAQSkZJRgABAQ==";

function analyzePhoto(body: RequestBody, headers?: Record<string, string>) {
  return POST(postRequest("/api/analyze-photo", body, headers));
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

  it("returns 500 when no OpenAI key is configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", undefined);

    const response = await analyzePhoto({ json: { image: TINY_JPEG_BASE64 } });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: expect.any(String) });
  });

  it("returns 200 with the AI's description", async () => {
    stubFetch({
      [OPENAI_CHAT_URL]: () =>
        Response.json({
          choices: [
            { message: { content: "A deep cut above the left eyebrow." } },
          ],
        }),
    });

    const response = await analyzePhoto({ json: { image: TINY_JPEG_BASE64 } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      description: "A deep cut above the left eyebrow.",
    });
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
