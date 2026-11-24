import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze-photo/route";
import {
  postRequest,
  stubFetch,
  type FetchResponder,
  type RequestBody,
} from "./helpers";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const SUPABASE_URL = "https://test-project.supabase.co";
const QUOTA_CHECK_URL = `${SUPABASE_URL}/rest/v1/rpc/claim_photo_analysis`;

// Contract tests for POST /api/analyze-photo: the status and body returned
// for a given request, and what reaches the quota check and the AI.

const CITIZEN_AUTHORIZATION = "Bearer citizen-access-token";

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

/** Posts to the endpoint as a signed-in citizen, unless headers are given. */
function analyzePhoto(
  body: RequestBody,
  headers: Record<string, string> = { Authorization: CITIZEN_AUTHORIZATION }
) {
  return POST(postRequest("/api/analyze-photo", body, headers));
}

/** The quota function's answer, as the database API sends it. */
function quotaCheckReturning(answer: string): FetchResponder {
  return () => Response.json(answer);
}

/** An OpenAI chat response that describes the photo. */
function aiAnswer(description: string): Response {
  return Response.json({ choices: [{ message: { content: description } }] });
}

/**
 * An AI that answers with the given description after a delay. As with a
 * real fetch, the request fails instead if it is cancelled first.
 */
function slowAI(description: string, delayMs: number): FetchResponder {
  return (request) =>
    new Promise((resolve, reject) => {
      const answerTimer = setTimeout(
        () => resolve(aiAnswer(description)),
        delayMs
      );
      request.signal.addEventListener("abort", () => {
        clearTimeout(answerTimer);
        reject(request.signal.reason);
      });
    });
}

/**
 * Stubs the quota check and the AI. By default the quota check passes and the
 * AI describes the photo. Returns what reached each one: the Authorization
 * header of each quota check, and the image URL of each AI request.
 */
function stubServices({
  quota = quotaCheckReturning("ok"),
  ai = () => aiAnswer(AI_DESCRIPTION),
}: { quota?: FetchResponder; ai?: FetchResponder } = {}) {
  const reached = {
    quotaChecks: [] as (string | null)[],
    aiImageUrls: [] as string[],
  };
  stubFetch({
    [QUOTA_CHECK_URL]: (request) => {
      reached.quotaChecks.push(request.headers.get("Authorization"));
      return quota(request);
    },
    [OPENAI_CHAT_URL]: async (request) => {
      reached.aiImageUrls.push(imageUrlIn(await request.clone().json()));
      return ai(request);
    },
  });
  return reached;
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
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  stubFetch(); // no responders: any outbound call fails the test
});

describe("POST /api/analyze-photo", () => {
  it.each([
    ["no Authorization header", {}],
    ["an empty bearer token", { Authorization: "Bearer " }],
    ["another scheme", { Authorization: "Basic dXNlcjpwYXNzd29yZA==" }],
  ])(
    "returns 401 for %s, without checking the quota",
    async (_label, headers) => {
      const reached = stubServices();

      const response = await analyzePhoto(
        { json: { image: TINY_JPEG_BASE64 } },
        headers
      );

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: expect.any(String) });
      expect(reached).toEqual({ quotaChecks: [], aiImageUrls: [] });
    }
  );

  it("returns 401 for a request without a token, whatever its body", async () => {
    const response = await analyzePhoto({ raw: "not json" }, {});

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: expect.any(String) });
  });

  it("returns 400 for a body that isn't JSON, without checking the quota", async () => {
    const reached = stubServices();

    const response = await analyzePhoto({ raw: "not json" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(reached).toEqual({ quotaChecks: [], aiImageUrls: [] });
  });

  it.each([
    ["missing", {}],
    ["a number", { image: 12345 }],
    ["an object", { image: { data: "aGVsbG8=" } }],
  ])(
    "returns 400 when image is %s, without checking the quota",
    async (_label, json) => {
      const reached = stubServices();

      const response = await analyzePhoto({ json });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: expect.any(String) });
      expect(reached).toEqual({ quotaChecks: [], aiImageUrls: [] });
    }
  );

  it("returns 413 for an image over 1.5 MB, without checking the quota", async () => {
    const reached = stubServices();
    const image = base64File(JPEG_SIGNATURE, 1_501_000);

    const response = await analyzePhoto({ json: { image } });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(reached).toEqual({ quotaChecks: [], aiImageUrls: [] });
  });

  it("accepts an image just under 1.5 MB", async () => {
    stubServices();
    const image = base64File(JPEG_SIGNATURE, 1_499_000);

    const response = await analyzePhoto({ json: { image } });

    expect(response.status).toBe(200);
  });

  it.each([
    ["a GIF", Buffer.from("GIF89a\x01\x00\x01\x00").toString("base64")],
    ["a PDF", Buffer.from("%PDF-1.7\n").toString("base64")],
    ["plain text", Buffer.from("hello, world").toString("base64")],
    ["not base64", "this is not base64!"],
  ])(
    "returns 415 for %s, without checking the quota",
    async (_label, image) => {
      const reached = stubServices();

      const response = await analyzePhoto({ json: { image } });

      expect(response.status).toBe(415);
      expect(await response.json()).toEqual({ error: expect.any(String) });
      expect(reached).toEqual({ quotaChecks: [], aiImageUrls: [] });
    }
  );

  it("checks the quota with the caller's own token", async () => {
    const reached = stubServices();

    const response = await analyzePhoto({ json: { image: TINY_JPEG_BASE64 } });

    expect(response.status).toBe(200);
    expect(reached.quotaChecks).toEqual([CITIZEN_AUTHORIZATION]);
  });

  it("returns 401 without calling the AI when the database rejects the token", async () => {
    const reached = stubServices({
      quota: () =>
        Response.json(
          {
            code: "PGRST301",
            details: null,
            hint: null,
            message: "JWT expired",
          },
          { status: 401 }
        ),
    });

    const response = await analyzePhoto({ json: { image: TINY_JPEG_BASE64 } });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(reached.aiImageUrls).toEqual([]);
  });

  it("returns 401 without calling the AI when the quota check finds no signed-in user", async () => {
    const reached = stubServices({
      quota: quotaCheckReturning("unauthenticated"),
    });

    const response = await analyzePhoto({ json: { image: TINY_JPEG_BASE64 } });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(reached.aiImageUrls).toEqual([]);
  });

  it.each(["user_limit", "daily_limit"])(
    "returns 429 with Retry-After, without calling the AI, when the quota check returns %s",
    async (answer) => {
      const reached = stubServices({ quota: quotaCheckReturning(answer) });

      const response = await analyzePhoto({
        json: { image: TINY_JPEG_BASE64 },
      });

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("3600");
      expect(await response.json()).toEqual({ error: expect.any(String) });
      expect(reached.aiImageUrls).toEqual([]);
    }
  );

  it.each<[string, FetchResponder]>([
    [
      "the database can't be reached",
      () => {
        throw new TypeError("fetch failed");
      },
    ],
    [
      "the database returns 500",
      () =>
        Response.json(
          { message: "canceling statement due to statement timeout" },
          { status: 500 }
        ),
    ],
    [
      "the quota check returns an unexpected value",
      quotaCheckReturning("maybe"),
    ],
    ["the quota check returns nothing", () => Response.json(null)],
  ])("returns 503 without calling the AI when %s", async (_label, quota) => {
    const reached = stubServices({ quota });

    const response = await analyzePhoto({ json: { image: TINY_JPEG_BASE64 } });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(reached.aiImageUrls).toEqual([]);
  });

  it("returns 503 without calling the AI when the database isn't configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    const reached = stubServices();

    const response = await analyzePhoto({ json: { image: TINY_JPEG_BASE64 } });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(reached.aiImageUrls).toEqual([]);
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
      const reached = stubServices();

      const response = await analyzePhoto({ json: { image } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        description: AI_DESCRIPTION,
      });
      expect(reached.aiImageUrls).toEqual([`data:${mimeType};base64,${image}`]);
    }
  );

  it.each([
    ["data:image/jpeg;base64,"],
    ["data:image/png;base64,"], // mislabelled: the bytes decide the type
  ])("accepts an image with a leading %s prefix", async (prefix) => {
    const reached = stubServices();

    const response = await analyzePhoto({
      json: { image: prefix + TINY_JPEG_BASE64 },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      description: AI_DESCRIPTION,
    });
    expect(reached.aiImageUrls).toEqual([
      `data:image/jpeg;base64,${TINY_JPEG_BASE64}`,
    ]);
  });

  it.each([
    ["empty content", { choices: [{ message: { content: "" } }] }],
    ["no choices", { choices: [] }],
  ])("returns 502 when the AI response has %s", async (_label, aiBody) => {
    stubServices({ ai: () => Response.json(aiBody) });

    const response = await analyzePhoto({ json: { image: TINY_JPEG_BASE64 } });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: expect.any(String) });
  });

  it.each([
    [
      401,
      "Incorrect API key provided: sk-proj-****wxyz. You can find your API key at https://platform.openai.com/account/api-keys.",
    ],
    [
      429,
      "Rate limit reached for gpt-4o-mini in organization org-Q7xK2mP9 on requests per min (RPM): Limit 3, Used 3, Requested 1.",
    ],
    [
      500,
      "The server had an error while processing your request. Sorry about that!",
    ],
  ])(
    "returns 502 without the provider's message when the AI returns %s",
    async (providerStatus, providerMessage) => {
      stubServices({
        ai: () =>
          Response.json(
            { error: { message: providerMessage } },
            { status: providerStatus }
          ),
      });

      const response = await analyzePhoto({
        json: { image: TINY_JPEG_BASE64 },
      });

      const body = await response.text();
      expect(response.status).toBe(502);
      expect(JSON.parse(body)).toEqual({ error: expect.any(String) });
      expect(body).not.toContain(providerMessage);
      expect(body).not.toMatch(/sk-|org-/); // no API key or organization ID
    }
  );

  it("returns 502 without the cause when the AI can't be reached", async () => {
    stubServices({
      ai: () => {
        throw new TypeError("fetch failed");
      },
    });

    const response = await analyzePhoto({ json: { image: TINY_JPEG_BASE64 } });

    const body = await response.text();
    expect(response.status).toBe(502);
    expect(JSON.parse(body)).toEqual({ error: expect.any(String) });
    expect(body).not.toContain("fetch failed");
  });

  it("returns 502 when the AI hasn't answered after 25 seconds", async () => {
    vi.useFakeTimers();
    stubServices({ ai: slowAI(AI_DESCRIPTION, 30_000) });

    const pendingResponse = analyzePhoto({
      json: { image: TINY_JPEG_BASE64 },
    });
    await vi.advanceTimersByTimeAsync(25_000);
    const response = await pendingResponse;

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: expect.any(String) });
  });

  it("returns 200 with the description when the AI answers just before 25 seconds", async () => {
    vi.useFakeTimers();
    stubServices({ ai: slowAI(AI_DESCRIPTION, 24_999) });

    const pendingResponse = analyzePhoto({
      json: { image: TINY_JPEG_BASE64 },
    });
    await vi.advanceTimersByTimeAsync(24_999);
    const response = await pendingResponse;

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ description: AI_DESCRIPTION });
  });
});
