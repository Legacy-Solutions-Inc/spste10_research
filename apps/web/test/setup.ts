import { afterEach, vi } from "vitest";
import { failOnUnexpectedFetches } from "./helpers";

// Every test starts from the real fetch, timers and environment.
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  failOnUnexpectedFetches();
});
