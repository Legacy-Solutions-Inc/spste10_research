import { NextRequest } from "next/server";
import { vi } from "vitest";

/** Body for a test request: a value sent as JSON, or a raw string sent as-is. */
export type RequestBody = { json: unknown } | { raw: string };

/** Builds a POST request for a route handler under test. */
export function postRequest(
  path: string,
  body: RequestBody,
  headers: Record<string, string> = {}
): NextRequest {
  const isJson = "json" in body;
  return new NextRequest(new URL(path, "http://localhost"), {
    method: "POST",
    headers: isJson
      ? { "Content-Type": "application/json", ...headers }
      : headers,
    body: isJson ? JSON.stringify(body.json) : body.raw,
  });
}

/** Answers one outbound request made by the code under test. */
export type FetchResponder = (request: Request) => Response | Promise<Response>;

const unexpectedFetches: string[] = [];

/**
 * Replaces global fetch for the current test. Each outbound request is
 * answered by the responder keyed by its URL without the query string, e.g.
 * "https://api.openai.com/v1/chat/completions".
 *
 * A request to any other URL throws, so no test can reach the network. It is
 * also recorded and fails the test afterwards, even if the code under test
 * catches the error. test/setup.ts does that check and restores the real fetch.
 */
export function stubFetch(responders: Record<string, FetchResponder> = {}) {
  vi.stubGlobal("fetch", async (...args: Parameters<typeof fetch>) => {
    const request = new Request(...args);
    const url = new URL(request.url);
    const respond = responders[url.origin + url.pathname];
    if (!respond) {
      const call = `${request.method} ${request.url}`;
      unexpectedFetches.push(call);
      throw new Error(`Unexpected fetch in test: ${call}`);
    }
    return respond(request);
  });
}

/** Throws if the test made any outbound request with no responder. */
export function failOnUnexpectedFetches(): void {
  const calls = unexpectedFetches.splice(0);
  if (calls.length > 0) {
    throw new Error(`Unexpected fetch in test: ${calls.join(", ")}`);
  }
}
