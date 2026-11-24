# Implementation prompts: photo-description security

One prompt per ticket, for a fresh session. Paste everything inside a ticket's code block as the first message. The prompts are copied from the end of each ticket file in `issues/`. Keep these files in sync if you edit a ticket's prompt.

**Run order**

| Step | Ticket | Blocked by | Status |
|---|---|---|---|
| 1 | 01 — Test harness for the photo-description endpoint | None | Done (commit `8c3dca5`) |
| 2 | 02 — High-resolution photos get described | 01 | Ready |
| 2 | 03 — AI call can't hang or leak provider errors | 01 (can run alongside 02) | Ready |
| 3 | 04 — Only signed-in citizens, within limits, get descriptions | 02 | Waiting on 02 |

**Good to know**
- **Branch:** every prompt works on the branch that's already checked out (it should be `fix/photo-analysis-auth`). It never creates, switches or deletes branches.
- **No commits:** each session leaves its changes uncommitted for you to review. It doesn't stage, commit, push or open a pull request; its report suggests the commit message.
- **Running 02 and 03 together:** they edit the same endpoint. Since nothing is committed between them, each re-reads the handler before editing and keeps the other's changes.
- **Ticket 04:** stops to ask you before applying the database migration to the live Supabase project. It also asks you for the QA citizen password; never paste it into a file.
- **Phone checks:** the ones in 02 and 04 are yours. The prompts end with the steps.
- **Clear the context** between tickets.

Framework: RISEN (Role, Instructions, Steps, End goal, Narrowing).

---

## 01 — Test harness for the photo-description endpoint

Ticket: `issues/01-endpoint-test-harness.md`

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

---

## 02 — High-resolution photos get described

Ticket: `issues/02-high-resolution-photos-get-described.md`

```
You are a senior full-stack engineer (Next.js 14 and Expo / React Native) working in the AGAP monorepo at "/Users/rafaeliiiprudente/Documents/coding projects/spste10_research" (pnpm 8 + Turborepo; apps/web is Next.js 14 App Router; apps/mobile is Expo SDK 58). Your job is ticket 02 of the photo-description security work: a citizen filing a Report from any phone, including one with a high-resolution camera, gets a photo description. The AGAP app sends a small resized copy of the photo, and the web endpoint POST /api/analyze-photo refuses anything too large, or not an image, before calling the AI.

Work test-first on the endpoint: write the failing contract tests, then make them pass. Leave the emergency flow untouched:
- The description runs in the background on the Report review screen and must never block Send.
- The photo stored with the Report must stay the original full-quality capture. Only the copy sent for the description is resized.

1. Read .scratch/photo-analysis-auth/issues/02-high-resolution-photos-get-described.md (your acceptance criteria), plus the relevant parts of docs/specs/photo-analysis-auth.md and docs/plans/photo-analysis-auth.md. Then read:
   - the endpoint handler, and the Vitest tests added by ticket 01;
   - the mobile photo-description client and its hook;
   - the Report review screen, to understand the background description, not to change it.
2. Run git status and git branch --show-current, and work on the branch that's already checked out (it should be fix/photo-analysis-auth). Do not create or switch branches. Confirm ticket 01 is done: its tests exist, and pnpm --filter web test runs them and passes. If not, stop and report. Ticket 03 may be in progress or done in the same working tree; if its changes are there, keep its behaviour, and leave alone any changes you didn't make.
3. Write the endpoint tests first:
   - 413 for an image over about 1.5 MB decoded;
   - 415 for a payload whose leading bytes aren't JPEG or PNG;
   - "image" is accepted with or without a leading data: prefix;
   - a PNG is sent to the AI as image/png;
   - a valid JPEG returns 200 with the description;
   - none of the 413 or 415 cases call the AI stub.
4. Implement it in the endpoint:
   - strip an optional data:...;base64, prefix;
   - reject when the base64 is longer than about 2,000,000 characters (413);
   - decode only the first few bytes, and accept JPEG (FF D8 FF) or PNG (89 50 4E 47 0D 0A 1A 0A), otherwise 415;
   - build the data URL sent to the AI from the detected type.
   All of this runs before any outbound call. Leave the model, the prompts and the rest of the response contract as they are.
5. Mobile:
   - In apps/mobile, run NODE_OPTIONS=--no-network-family-autoselection npx expo install expo-image-manipulator (without that prefix, installs time out on this machine) so you get the version bundled with Expo SDK 58 (expected ~58.0.x).
   - Read the installed package's type definitions to confirm its current API. If there's a deprecated API as well as the current contextual one (manipulate, resize, render, save with base64), use the current one.
   - In the photo-description client, replace the JavaScript base64 conversion: resize to width 1024 keeping aspect ratio, save as JPEG at about 0.7 compression with base64 output, and send that.
   - The Storage upload of the Report photo must keep using the original image.
6. Inspect the pnpm-lock.yaml diff. It should only add the image manipulation module and its dependencies. If unrelated churn appears, regenerate with NODE_OPTIONS=--no-network-family-autoselection pnpm install rather than hand-editing, and never apply partial (-U0) hunks.
7. Run pnpm --filter web test, pnpm --filter web lint, pnpm --filter web exec tsc --noEmit and pnpm --filter mobile typecheck, and fix anything you broke.
8. You can't operate a phone. Leave the manual-phone criterion unticked, and in your report give the owner these steps:
   - point EXPO_PUBLIC_API_ORIGIN at the dev machine's LAN address;
   - run the app in Expo Go or a dev build;
   - take a Report photo, and confirm a description appears and the Report sends with it;
   - confirm the web dashboard shows the full-quality photo.
9. Tick the criteria you've met in the ticket file. Set Status to done only if every criterion is met; otherwise leave it and say what's left. Do not stage, commit or push anything: leave all changes uncommitted for the owner to review, and suggest the commit message "feat: resize report photos for descriptions and validate size and type" in your report.

You're done when:
- the new endpoint tests and all earlier tests pass;
- lint and both typechecks pass;
- the app sends a resized JPEG while the stored photo stays full quality;
- every change is left uncommitted on the current branch.

Limits:
- Do not add sign-in, tokens or rate limits (ticket 04), or change the AI timeout or error messages (ticket 03).
- Do not change the Report review screen, the Report record, the Storage upload, the AI model or the prompts.
- Add no dependency other than the Expo image manipulation module.
- Do not touch .env files or put secrets in any file.
- Do not create, switch, rename or delete branches.
- Do not stage, commit or push anything, and don't open a pull request.

Finish with a short report:
- files changed, and a suggested commit message;
- the test, lint and typecheck results;
- the image manipulation API you used, and why;
- the manual phone steps for the owner;
- anything you couldn't verify.
```

---

## 03 — AI call can't hang or leak provider errors

Ticket: `issues/03-ai-call-cannot-hang-or-leak-errors.md`

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

---

## 04 — Only signed-in citizens, within limits, get descriptions

Ticket: `issues/04-signed-in-citizens-within-limits.md`

```
You are a senior full-stack engineer with strong Postgres and Supabase security experience, working in the AGAP monorepo at "/Users/rafaeliiiprudente/Documents/coding projects/spste10_research":
- pnpm 8 + Turborepo;
- apps/web is Next.js 14 App Router, on Vercel;
- apps/mobile is Expo SDK 58;
- the live Supabase project id is lmthlfqfbhuspsecpdgx, reachable through the Supabase MCP tools.

Your job is ticket 04 of the photo-description security work: only people signed in to the AGAP app can get photo descriptions, at most 10 per person per rolling hour and 300 across everyone per rolling 24 hours. Strangers get nothing, and the AI budget can't be drained. A signed-out or over-limit citizen sees the existing "description unavailable" state on the Report review screen, and the Report still sends.

The spec fixes the design; follow it rather than redesigning it:
- One database function, claim_photo_analysis(), checks identity and quota together.
- The endpoint calls it with the citizen's own access token. PostgREST rejects forged or expired tokens before the function runs, and auth.uid() identifies the caller.
- There's no service-role key and no external rate-limit store.

Work test-first on the endpoint. Treat the live database with care: verify in a transaction that rolls back, and apply to the live project only after the owner says yes.

1. Read .scratch/photo-analysis-auth/issues/04-signed-in-citizens-within-limits.md (your acceptance criteria), and docs/specs/photo-analysis-auth.md and docs/plans/photo-analysis-auth.md in full. Then read:
   - the endpoint handler and its Vitest tests;
   - the mobile photo-description client and hook;
   - the existing migrations in supabase/migrations. Copy the grant pattern from the incident-claims migration, and the SECURITY DEFINER and search_path conventions and header-comment style from the roles-and-approvals migration.
2. Run git status and git branch --show-current, and work on the branch that's already checked out (it should be fix/photo-analysis-auth). Do not create or switch branches. Confirm ticket 02 is done: the endpoint already returns 413/415 and its tests pass. If not, stop and report. Leave alone any changes you didn't make.
3. Write the migration as a new file in supabase/migrations, timestamped after the latest existing one (for example 20261124000000_photo_analysis_quota.sql), with a header comment explaining why it exists.
   a. Create the table public.photo_analysis_requests:
      - id bigint identity primary key;
      - user_id uuid not null references auth.users on delete cascade;
      - created_at timestamptz not null default now();
      - indexes on (user_id, created_at) and (created_at);
      - RLS enabled with no policies, and all privileges revoked from anon and authenticated.
   b. Create public.claim_photo_analysis() returns text: LANGUAGE plpgsql, SECURITY DEFINER, SET search_path = '', with the limits as named constants at the top. In order, it:
      - returns 'unauthenticated' when auth.uid() is null;
      - takes pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
      - deletes rows older than 1 day;
      - returns 'user_limit' if the caller has 10 or more rows in the last hour;
      - returns 'daily_limit' if there are 300 or more rows overall in the last 24 hours;
      - otherwise inserts a row and returns 'ok'.
   c. Revoke EXECUTE on the function from PUBLIC and anon, and grant it to authenticated and service_role.
4. Verify the migration with the Supabase MCP execute_sql tool, in a single transaction that can't persist:
   - Begin, and run the migration SQL.
   - Act as a citizen with set local role authenticated and set_config('request.jwt.claims', '{"sub":"<user id>","role":"authenticated"}', true).
   - Check each of the following:
     - ten calls return ok, and the eleventh returns user_limit;
     - a second user is unaffected;
     - empty claims give unauthenticated;
     - with 300 recent rows from other users, the next caller gets daily_limit;
     - rows older than a day don't count;
     - authenticated and anon can't select from or insert into the table;
     - anon can't execute the function.
   - user_id must reference real auth.users rows: use existing user ids, or insert throwaway auth.users rows inside the same transaction.
   - End with RAISE EXCEPTION so everything rolls back. Then confirm with a separate query that neither the table nor the function exists.
5. Stop and ask the owner for a go-ahead to apply the migration to the live project. Only after a clear yes:
   - Apply it with the MCP apply_migration tool (name: photo_analysis_quota).
   - If the tool returns "Invalid or expired requestState", check list_migrations before retrying, so it isn't applied twice.
   - Run get_advisors (security), and confirm the only new note is the intentional "callable by signed-in users" one for claim_photo_analysis.
6. Write the endpoint tests first. Update the existing tests to send a bearer token, and stub the RPC call (a POST to the Supabase URL's /rest/v1/rpc/claim_photo_analysis) in the URL-routing fetch stub. Add these cases:
   - no Authorization header returns 401;
   - PostgREST answering the RPC with 401 returns 401;
   - 'unauthenticated' returns 401;
   - 'user_limit' and 'daily_limit' return 429 with a Retry-After header of 3600;
   - any other RPC failure (network error, 5xx, unexpected value) returns 503;
   - the AI stub is not called on 401, 429 or 503;
   - requests rejected with 400, 413 or 415 never reach the RPC stub.
7. Implement it in the endpoint:
   - Require "Authorization: Bearer <token>" before reading the body, and return 401 without it.
   - Keep ticket 02's validation.
   - Create a client with createClient from @supabase/supabase-js, using NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, with global.headers.Authorization set to the caller's header and auth { persistSession: false, autoRefreshToken: false }.
   - Call rpc("claim_photo_analysis") with a // @ts-ignore, as the web app's existing incident-claims helper does.
   - Map the result as in step 6, and call the AI only on 'ok'.
   - Never log tokens.
8. Mobile:
   - In the photo-description client, read access_token from supabase.auth.getSession(). If there's no session, throw "Not signed in", so the hook returns null and the review screen shows "unavailable".
   - Send the Authorization header.
   - Map 401 to "Not signed in", 429 to "Photo descriptions are paused for a while", and anything else to a generic message.
   - In the hook, remove the dead API-key error checks and the "Invalid API key" wording. Keep the 30-second timeout and the return-null-on-failure behaviour.
9. Add a README section covering:
   - the endpoint requires a signed-in session;
   - the limits, and where to change them;
   - rollout order: database, then the new app build, then the endpoint;
   - the app change needs a new EAS build, not an over-the-air update;
   - a recommendation to set a monthly budget on the OpenAI project.
10. Run pnpm --filter web test, pnpm --filter web lint, pnpm --filter web exec tsc --noEmit and pnpm --filter mobile typecheck.
11. Once the migration is applied, run a live check against the local dev server.
    - It may already be running on http://localhost:3000 via turbo; don't kill it. If its .next folder is corrupted, delete .next and touch next.config.js to restart it.
    - Get a QA citizen token by signing in qa.citizen@agap.test through the Supabase Auth REST API. Ask the owner for its password if you don't have it, and never write the password or token into any file.
    - With curl, check:
      - no token gives 401;
      - a garbage token gives 401;
      - the QA citizen token with a small real photo gives 200 with a description.
    - Seed 10 recent rows for that citizen with SQL and confirm 429. Then delete every photo_analysis_requests row for that citizen.
12. You can't operate a phone. Leave the manual-phone criterion unticked, and give the owner exact steps in your report.
13. Tick the criteria you've met in the ticket file; set Status to done only if all are met. Do not stage, commit or push anything: leave all changes uncommitted for the owner to review. In your report, suggest two commits and which files go in each:
    - "feat: require sign-in and rate-limit photo descriptions" (migration, endpoint, tests, README);
    - "feat(mobile): send the session with photo description requests" (mobile client and hook).

You're done when:
- the SQL checks pass;
- the migration is applied to the live project with the owner's approval, and the advisor shows nothing unexpected;
- all endpoint tests pass, and lint and both typechecks pass;
- the curl checks return 401, 401, 200 and 429 as described, and the test rows are deleted;
- every change is left uncommitted on the current branch.

Limits:
- Do not use a service-role key, Redis, Vercel KV or any new infrastructure, and don't add new npm dependencies.
- Do not apply the migration without the owner's explicit yes, and don't edit or re-apply earlier migrations.
- Do not change the limits, the Report review screen, the Report record, the Storage upload, the AI model or the prompts.
- Do not weaken any RLS policy or grant.
- Never log or commit tokens, passwords or .env contents.
- Do not create, switch, rename or delete branches.
- Do not stage, commit or push anything, and don't open a pull request.

Finish with a short report:
- files changed, and the two suggested commits;
- the SQL check results;
- whether and when the migration was applied, and the advisor output;
- the test, lint and typecheck results;
- the curl results, and the rows cleaned up;
- the manual phone steps for the owner;
- anything you couldn't verify.
```

