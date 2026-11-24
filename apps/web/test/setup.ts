import { afterEach, vi } from "vitest";
import { failOnUnexpectedFetches } from "./helpers";

// Every test starts from the real fetch and environment.
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  failOnUnexpectedFetches();
});
