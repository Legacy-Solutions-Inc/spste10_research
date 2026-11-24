# 03 — AI call can't hang or leak provider errors

**What to build:** when the AI provider is slow or fails, the photo-description endpoint answers promptly with a plain, generic failure. The citizen's review screen then shows its existing "description unavailable" state, and the Report still sends.

The provider's own error text never reaches the public response. It's recorded in server logs so the project owner can diagnose problems after a usability session.

Spec: `docs/specs/photo-analysis-auth.md` (Implementation Decisions → photo-description endpoint, check 8).

**Blocked by:** 01 — Test harness for the photo-description endpoint. It can run alongside 02.

**Status:** done

- [x] The outbound AI request is cancelled after 25 seconds.
- [x] The endpoint asks the host for up to 30 seconds of run time, so a slow but successful call isn't cut off by the default limit.
- [x] Generic 502 responses, with server logs keeping the detail:
  - A provider error status returns 502 with a generic message, and logs the provider's status and message.
  - A provider timeout or network failure returns 502 with a generic message, and logs the cause.
- [x] No response body ever contains the provider's error text or account details.
- [x] The existing "no AI key configured" and "empty AI response" behaviour still holds; ticket 01's tests stay green.
- [x] Endpoint tests cover:
  - A provider error gives 502, and the body doesn't contain the stubbed provider message.
  - A provider timeout gives 502. Use fake timers or an aborting stub, so the test doesn't wait 25 seconds.
- [x] The web lint, typecheck and tests pass.

## Implementation prompt

Framework: RISEN (Role, Instructions, Steps, End goal, Narrowing). Paste everything inside the block into a fresh session.

```
You are a senior TypeScript engineer working in the AGAP monorepo at "/Users/rafaeliiiprudente/Documents/coding projects/spste10_research" (pnpm 8 + Turborepo; apps/web is Next.js 14 App Router, deployed on Vercel). Your job is ticket 03 of the photo-description security work: when the AI provider is slow or fails, the web endpoint POST /api/analyze-photo answers promptly with a plain, generic failure. The provider's own error text never reaches the public response. It goes to server logs, so the project owner can diagnose problems.

Work test-first: write the failing contract tests, then make them pass. Tests assert only on status codes and response bodies. The AGAP app already treats any failed description as "unavailable" and still sends the Report, so no app change is needed.

1. Read .scratch/photo-analysis-auth/issues/03-ai-call-cannot-hang-or-leak-errors.md (your acceptance criteria) and the relevant parts of docs/specs/photo-analysis-auth.md (Implementation Decisions, check 8). Then read the endpoint handler, and the Vitest tests and helper from ticket 01.
2. Run git status and git branch --show-current, and work on the branch that's already checked out (it should be fix/photo-analysis-auth). Do not create or switch branches. Confirm ticket 01 is done (pnpm --filter web test runs its tests and passes); if not, stop and report. Ticket 02 may be in progress or done in the same working tree and edits the same handler, so:
   - re-read the handler right before you edit it, and again before you finish;
   - if ticket 02's validation is there, keep it intact;
   - leave alone any other changes you didn't make.
3. Write the tests first:
   - a provider error status returns 502 with a generic message, and the response body does not contain the stubbed provider error text;
   - a provider timeout returns 502.
   Simulate the timeout without waiting 25 seconds: either have the fetch stub reject with a DOMException named "TimeoutError" or "AbortError", or use fake timers if your timeout is built on setTimeout. Keep ticket 01's tests for the missing AI key (500) and the empty AI response (502) green.
4. Implement it:
   - Cancel the outbound AI request after 25 seconds, with AbortSignal.timeout(25_000), or an AbortController with setTimeout if that tests more cleanly.
   - Map provider error statuses, timeouts and network failures to 502 with one generic message.
   - Log the provider status and message (or the cause) with console.error. Never log the API key, the request headers or the image.
   - Add export const maxDuration = 30 to the route, so a slow but successful call isn't cut off by the host's default limit.
5. Run pnpm --filter web test, pnpm --filter web lint and pnpm --filter web exec tsc --noEmit, and fix anything you broke.
6. Tick the criteria you've met in the ticket file and set Status to done. Do not stage, commit or push anything: leave all changes uncommitted for the owner to review, and suggest the commit message "fix(web): time out AI calls and stop leaking provider errors" in your report.

You're done when:
- the new tests and all earlier tests pass;
- lint and typecheck pass;
- no response body can contain provider error text;
- every change is left uncommitted on the current branch.

Limits:
- Do not add sign-in, tokens or rate limits (ticket 04).
- Do not change image validation (ticket 02), the AI model, the prompts or the success response shape.
- Do not touch apps/mobile or .env files, or put secrets in any file.
- Do not create, switch, rename or delete branches.
- Do not stage, commit or push anything, and don't open a pull request.

Finish with a short report:
- files changed, and a suggested commit message;
- the test, lint and typecheck results;
- how you implemented and tested the timeout;
- anything you couldn't verify.
```
