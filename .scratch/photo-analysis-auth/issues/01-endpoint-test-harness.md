# 01 — Test harness for the photo-description endpoint

**What to build:** a working automated test setup in the web app. Its first tests pin down how the photo-description endpoint behaves today, so tickets 02–04 can change the endpoint safely.

This is groundwork; no user-facing behaviour changes. Tests call the endpoint's request handler directly with constructed requests. Outbound calls to the AI provider (and later the database API) are stubbed at the `fetch` boundary, so tests never use the network.

Spec: `docs/specs/photo-analysis-auth.md` (Testing Decisions → Seam 1). Plan: `docs/plans/photo-analysis-auth.md`.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Vitest is a dev dependency of the web app only. The lockfile change is limited to that.
- [x] A `test` script runs the suite once (non-watch) and exits non-zero on failure. `pnpm --filter web test` passes.
- [x] A shared test helper builds endpoint requests and stubs `fetch` per test. Each test restores the real `fetch` afterwards.
- [x] The tests pin down today's contract:
  - A non-JSON body returns 400.
  - A missing or non-string `image` returns 400.
  - No AI key configured returns 500.
  - A successful AI response returns 200 with `{ description }`.
  - An empty AI response returns 502.
- [x] Tests assert only on status codes and response bodies, never on internal helpers or call order.
- [x] The existing web lint and typecheck still pass. The test files and config are included in, or deliberately excluded from, the typecheck.
- [x] The README says how to run the web tests.

## Implementation prompt

Framework: RISEN (Role, Instructions, Steps, End goal, Narrowing). Paste everything inside the block into a fresh session.

```
You are a senior TypeScript engineer adding the first automated test suite to the AGAP monorepo at "/Users/rafaeliiiprudente/Documents/coding projects/spste10_research" (pnpm 8 + Turborepo; apps/web is Next.js 14 App Router; apps/mobile is Expo SDK 58). Your job is ticket 01 of the photo-description security work: a Vitest harness for the web app's photo-description endpoint (POST /api/analyze-photo). Its first tests pin down how the endpoint behaves today, so later tickets can change it safely.

Work test-first and keep the setup minimal. Tests exercise the endpoint only through its public contract: call the route's exported POST handler with a constructed request, and assert on the status code and JSON body. Never assert on internal helpers or call order. Stub outbound network calls at the fetch boundary, so no test ever reaches the network. This ticket changes no production behaviour.

1. Read .scratch/photo-analysis-auth/issues/01-endpoint-test-harness.md (your acceptance criteria), docs/specs/photo-analysis-auth.md (especially Testing Decisions, Seam 1) and docs/plans/photo-analysis-auth.md. Then read the current photo-description route handler in apps/web so you know exactly how it responds today.
2. Run git status and git branch --show-current, and work on the branch that's already checked out (it should be fix/photo-analysis-auth). Do not create or switch branches. If the working tree has changes you didn't make, leave them alone.
3. Add Vitest as an exact-pinned dev dependency of the web app only (NODE_OPTIONS=--no-network-family-autoselection pnpm --filter web add -D --save-exact vitest; without that prefix, pnpm installs time out on this machine). Add a "test" script that runs the suite once and exits non-zero on failure (vitest run). Create a minimal Vitest config with the node environment that resolves the "@/" import alias the same way apps/web/tsconfig.json does.
4. Write a small shared test helper that:
   a. builds a POST request to the handler with a JSON or raw body and optional headers;
   b. stubs global fetch for one test with a function that answers by URL, so later tickets can add a Supabase route next to the OpenAI one.
   Restore the real fetch and environment after every test (vi.stubGlobal and vi.stubEnv, with vi.unstubAllGlobals and vi.unstubAllEnvs in afterEach).
5. Write characterization tests for today's contract:
   - a non-JSON body returns 400;
   - a missing or non-string "image" returns 400;
   - no OPENAI_API_KEY returns 500;
   - a successful AI response returns 200 with { description };
   - an empty AI response returns 502.
   If any of these doesn't match what the code actually does today, write the test to match today's real behaviour and mention the difference in your report. Do not change the route.
6. Run pnpm --filter web test, pnpm --filter web lint and pnpm --filter web exec tsc --noEmit.
   - Confirm the output shows the tests actually ran: pnpm 8 exits 0 silently when the package has no test script.
   - Make sure the test files and Vitest config either typecheck cleanly or are deliberately excluded from the app's typecheck.
   - Keep the existing "react" paths entry and typeRoots in apps/web/tsconfig.json. They stop the mobile app's hoisted @types/react@19 from leaking into the web typecheck.
7. Inspect the pnpm-lock.yaml diff. It should only add Vitest and its dependencies. If unrelated churn appears, regenerate the lockfile with NODE_OPTIONS=--no-network-family-autoselection pnpm install rather than hand-editing it, and never apply partial (-U0) hunks.
8. Add a short note to README.md on how to run the web tests.
9. In the ticket file, tick each acceptance criterion you've met and change Status to done. Do not stage, commit or push anything: leave all changes uncommitted for the owner to review, and suggest the commit message "test(web): add Vitest harness for the photo-description endpoint" in your report.

You're done when:
- pnpm --filter web test passes with the five characterization tests;
- lint and typecheck pass;
- the route's code is unchanged;
- every change is left uncommitted on the current branch.

Limits:
- Do not change the endpoint's behaviour, even if a test exposes a bug; report it instead.
- Do not add Jest, Playwright, MSW or any other test tooling. Don't write tests for other routes or for apps/mobile.
- Do not touch .env files or commit secrets.
- Do not create, switch, rename or delete branches.
- Do not stage, commit or push anything, and don't open a pull request.

Finish with a short report:
- files changed, and a suggested commit message;
- the test, lint and typecheck results;
- any difference between the ticket's description of today's behaviour and what you found;
- anything you couldn't verify.
```
