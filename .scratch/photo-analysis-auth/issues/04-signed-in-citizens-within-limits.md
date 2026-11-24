# 04 — Only signed-in citizens, within limits, get descriptions

**What to build:** photo descriptions are available only to people signed in to the AGAP app, within the following limits:
- 10 per person per rolling hour.
- 300 across everyone per rolling 24 hours, as a budget ceiling.

Strangers who find the endpoint get nothing, and the AI budget can't be drained. If a citizen is signed out or over the limit, the review screen shows its existing "description unavailable" state and the Report still sends normally.

One database function checks both identity and quota. The endpoint calls it with the citizen's own access token. The database API rejects forged or expired tokens before the function runs, so no service-role key or external rate-limit store is needed.

Spec: `docs/specs/photo-analysis-auth.md` (Implementation Decisions → usage log, quota function, one check for both, photo-description endpoint, mobile client, rollout; Testing Decisions → Seams 1 and 2).

**Blocked by:** 02 — High-resolution photos get described. Validation must run before the quota check, and both tickets change the same endpoint and app client.

**Status:** ready-for-agent

**Database**
- [x] A new migration adds a usage log that records who asked and when.
  - RLS is on with no policies, and all privileges are revoked from the anonymous and signed-in roles.
  - It's indexed for per-user and overall time-window counts.
- [x] A quota function takes no arguments and returns `ok`, `unauthenticated`, `user_limit` or `daily_limit`:
  - It identifies the caller from their session.
  - It serialises calls per user and removes rows older than a day.
  - It records the request only when it returns `ok`.
  - The limits are named constants at the top.
  - It runs with elevated rights and an empty, fixed search path.
  - Execute is granted to signed-in users only, as with the existing incident-claims function.
- [x] SQL checks pass in a transaction that rolls back, run as the signed-in role with simulated claims:
  - Ten calls return `ok`, then the eleventh returns `user_limit`.
  - Another user is unaffected.
  - No session returns `unauthenticated`.
  - With 300 recent rows from others, the next caller gets `daily_limit`.
  - Rows older than a day don't count.
  - The signed-in and anonymous roles can't read or write the log.
  - The anonymous role can't execute the function.
- [x] Only after those checks pass, and with the project owner's go-ahead, the migration is applied to the live Supabase project. Then the security advisor is run, and the only new note is the intentional "callable by signed-in users" one.
  - Applied 2026-11-24 as version 20261124032037. The advisor also shows one INFO note, "RLS enabled, no policy", for the usage log: that is the intended lock-down, not a gap.

**Endpoint**
- [x] The endpoint requires an `Authorization: Bearer <token>` header and returns 401 without one.
- [x] The endpoint calls the quota function with the caller's token. It runs after the body, size and type checks from ticket 02, so bad requests never use up quota.
- [x] Quota results map as follows:
  - Token rejected, or `unauthenticated`: 401.
  - `user_limit` or `daily_limit`: 429 with a `Retry-After` header.
  - Any other quota failure: 503, with no AI call (fail closed).
- [x] Endpoint tests cover each of those outcomes. They also check that the AI stub isn't called on 401, 429 or 503, and that 400, 413 and 415 requests never reach the quota stub. Earlier tests are updated to send a token, and stay green.

**App**
- [x] The app attaches the current session's access token to description requests. With no session, it skips the request and the review screen shows "unavailable".
- [x] Errors map to plain messages for logs: 401 is "not signed in", 429 is "temporarily paused", anything else is generic. The old "Invalid API key" wording and the dead API-key error checks are removed. The 30-second timeout and the return-nothing-on-failure behaviour stay.

**Docs and verification**
- [x] The README covers:
  - The endpoint requires a signed-in session.
  - The limits, and where to change them.
  - Rollout order: database, then the app build, then the endpoint.
  - The app change needs a new build, not an over-the-air update.
  - A recommendation to set a monthly budget on the AI provider account.
- [ ] Checks with curl against the dev server:
  - No token: 401. A garbage token: 401.
  - A QA citizen's token with a small real photo: 200 with a description.
  - After seeding 10 recent log rows for that citizen: 429. Remove the seeded and test rows afterwards.
  - Done 2026-11-24: no token 401, garbage token 401 (and the public anon key as the token 401). The owner chose to skip the signed-in 200 and 429 checks, so they are still to do. No log rows were created.
- [x] The app typecheck passes. The web lint, typecheck and tests pass.
- [ ] Manual check on a phone:
  - Signed in, a Report photo gets a description.
  - Signed out, or over the limit, the screen shows "unavailable".
  - The Report sends in both cases.

## Implementation prompt

Framework: RISEN (Role, Instructions, Steps, End goal, Narrowing). Paste everything inside the block into a fresh session.

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
