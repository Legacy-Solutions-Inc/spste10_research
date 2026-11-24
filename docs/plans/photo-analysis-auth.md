# Lock down the photo-description endpoint

## Context

When a citizen takes a report photo, the mobile app sends it to the web app's `POST /api/analyze-photo` (`agap-responders.vercel.app`). That route forwards the photo to OpenAI using the server's `OPENAI_API_KEY`.

**The route has no checks.** It doesn't require sign-in, limit how often it's called, or limit what it accepts. The web middleware skips `/api`. Anyone who finds the URL can run up the OpenAI bill.

**Large photos may already be failing.** The app sends the full-resolution camera JPEG (quality 0.8, often 3–6 MB) as base64. Vercel rejects request bodies over 4.5 MB. The app also builds that base64 one character at a time in JavaScript (`apps/mobile/src/lib/openai.ts:42-47`), which is slow for big images.

**Goal:** only signed-in app users can use photo descriptions, each within a limit, with a daily cap as a budget backstop. The app sends a small resized copy.

This doesn't change the emergency flow. Descriptions already run in the background and never block Send (`ReportScreen3.tsx:94-107`). If one is refused or rate-limited, the review screen shows its existing "unavailable" state and the report still goes out.

## Approach

### 1. Database: a usage log and one quota function

New migration `supabase/migrations/20261124000000_photo_analysis_quota.sql`:

**Table `public.photo_analysis_requests`**
- Columns: `id bigint identity`, `user_id uuid not null references auth.users on delete cascade`, `created_at timestamptz default now()`.
- Indexes on `(user_id, created_at)` and `(created_at)`.
- RLS enabled with no policies. `REVOKE ALL` from `anon` and `authenticated`, so the API can't read or write it directly.

**Function `public.claim_photo_analysis() RETURNS text`**
- `SECURITY DEFINER`, `SET search_path = ''`.
- Steps:
  1. If `auth.uid()` is null, return `'unauthenticated'`.
  2. `pg_advisory_xact_lock` on the user id, so parallel requests can't slip past the limit.
  3. Delete rows older than 1 day, which keeps the table tiny.
  4. If the user has made 10 or more requests in the last hour, return `'user_limit'`.
  5. If there have been 300 or more requests across all users in the last 24 hours, return `'daily_limit'`.
  6. Otherwise insert a row and return `'ok'`.
- The limits are named constants at the top of the function, so they're easy to change.
- `REVOKE EXECUTE` from `PUBLIC` and `anon`; `GRANT` to `authenticated`. This follows the same pattern as `get_incident_claims` in `20261028005300_incident_claims.sql`.

`SECURITY DEFINER` is needed because the daily cap counts every user's rows. The advisor will list this function as callable by signed-in users. That's intentional: it can only use up the caller's own quota.

**Why one RPC handles both sign-in and limits:** the route calls it with the user's token. PostgREST rejects a forged or expired token (401) before the function runs, and `auth.uid()` then names the user. One round trip does both checks, with no service-role key and no new infrastructure such as Redis or KV.

### 2. Web route: require sign-in, validate the image, enforce the quota

Rewrite `apps/web/src/app/api/analyze-photo/route.ts`. Keep the existing prompts and the OpenAI call (`gpt-4o-mini`). The order of checks:

1. **Token:** require `Authorization: Bearer <token>`, otherwise return 401.
2. **Body:** parse it and require `image` to be a string, otherwise 400. Strip any `data:` prefix.
   - If the base64 is over about 2,000,000 characters (≈1.5 MB of image), return 413.
   - Decode the first bytes and accept only JPEG (`FF D8 FF`) or PNG, otherwise 415. The detected type sets the mime in the data URL, which is currently hard-coded to jpeg.
3. **Quota:** create a client with `createClient` from `@supabase/supabase-js` (already a web dependency).
   - Settings: anon key, `global.headers.Authorization` set to the user's token, `auth: { persistSession: false, autoRefreshToken: false }`.
   - Call `rpc("claim_photo_analysis")` with a `// @ts-ignore`, as in `lib/incidentActions.ts:127`.
   - Responses:
     - A 401 from PostgREST, or `'unauthenticated'`: 401.
     - A limit: 429 with `Retry-After`.
     - Any other error: 503. This fails closed, so no OpenAI spend happens while the quota check is down.
4. **OpenAI:** call it with `AbortSignal.timeout(25_000)`.
   - Log upstream errors on the server. The client gets only a generic 502, instead of OpenAI's error text.
   - Add `export const maxDuration = 30` so a slow vision call isn't cut off by Vercel's default timeout.

Validation runs before the quota check, so malformed requests don't use up anyone's quota.

### 3. Mobile: send the session and a small JPEG

- **Add a dependency:** `expo-image-manipulator ~58.0.15`, the version Expo SDK 58 ships with. Install it with `npx expo install` in `apps/mobile`. Stage only `apps/mobile/package.json` and the lockfile changes it causes.
- **`apps/mobile/src/lib/openai.ts`:**
  - Get `access_token` from `supabase.auth.getSession()`. Throw `Not signed in` if there isn't one, and the hook returns null.
  - Replace `imageUriToBase64` with the manipulator: resize to width 1024, then save as JPEG at `compress: 0.7` with `base64: true`. That's roughly 150–300 KB, and the native code does the base64 encoding.
  - Confirm the SDK 58 API (`ImageManipulator.manipulate(uri).resize(...).renderAsync()` then `saveAsync`) against the installed typings.
  - Send `Authorization: Bearer <token>`.
  - Map 401 to `Not signed in` and 429 to `Photo descriptions are paused for a while`. Remove the misleading "Invalid API key" message.
- **`apps/mobile/src/screens/report/hooks/useAnalyzePhoto.ts`:** remove the dead API-key error classification. Keep the 30 s timeout and the return-null fallback.
- **No change** to `ReportScreen3.tsx` or the stored report photo. The photo uploaded to Storage stays full quality; only the copy sent to the AI is resized.

### 4. Docs

Add a short README note:
- `/api/analyze-photo` requires a Supabase access token.
- The limits are 10 per user per hour and 300 per day overall.
- Where to change them.
- A recommendation to also set a monthly budget on the OpenAI project.

## Rollout and git

- **Branch:** new branch `fix/photo-analysis-auth` from `main`. One commit for the database and web changes, one for mobile. Stage only these files, and don't push unless you ask.
- **Migration:** apply it to the live project (`lmthlfqfbhuspsecpdgx`) via MCP `apply_migration`, after it passes a rolled-back test transaction. This is the same process as the last four migrations. On its own it changes nothing for users.
- **Ship the mobile build before the web route if you can.** The new app works with the old route, because the old route ignores the extra header. Once the new route is deployed, older app installs stop getting descriptions, though their reports still send.
- **The mobile change needs a new build.** It adds a native module, so testers need a new EAS build; an over-the-air update isn't enough. Expo Go already includes the module.
- **For you to do:** set a monthly spend limit on the OpenAI project in the OpenAI dashboard.

## Verification

1. **Migration, inside a transaction that rolls back:**
   - Simulate a citizen by setting `request.jwt.claims` / role `authenticated`. Ten calls return `ok` and the 11th returns `user_limit`.
   - With no `sub`, it returns `unauthenticated`.
   - After seeding 300 rows from other users, it returns `daily_limit`.
   - As `authenticated` and `anon`, `SELECT`/`INSERT` on the table are denied.
   - Then apply the migration and run `get_advisors`. Expect only the intentional "callable by signed-in users" note.
2. **Route, against the local dev server (`localhost:3000`) with `curl`:**
   - No header: 401. A garbage token: 401. A tiny PNG with a `qa.citizen` token (from a REST sign-in): 200 with a description. That's one real OpenAI call, a fraction of a cent.
   - An oversized payload: 413. A non-image: 415.
   - After seeding 10 recent rows for `qa.citizen` via SQL: 429. Then delete those rows.
3. **Static checks:** `pnpm --filter web lint`, `tsc --noEmit` for web, and `pnpm --filter mobile typecheck`.
4. **On a phone, done by you:**
   - Set `EXPO_PUBLIC_API_ORIGIN` to the dev machine's LAN address and run the app in Expo Go or a dev build.
   - Take a report photo. The description should appear on the review screen, and the report should send with it.
   - Signed out, or with the limit hit, the screen should show "unavailable" and still send.
   - I can't operate a phone from here, so this step is yours.
5. **Cleanup:** delete the `photo_analysis_requests` rows created by testing.

## Files

- `supabase/migrations/20261124000000_photo_analysis_quota.sql` (new)
- `apps/web/src/app/api/analyze-photo/route.ts`
- `apps/mobile/src/lib/openai.ts`
- `apps/mobile/src/screens/report/hooks/useAnalyzePhoto.ts`
- `apps/mobile/package.json`, `pnpm-lock.yaml`
- `README.md`
