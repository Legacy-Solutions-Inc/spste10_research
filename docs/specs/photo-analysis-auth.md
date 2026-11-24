# Spec: Signed-in, rate-limited photo descriptions

Status: ready for implementation
Plan: `docs/plans/photo-analysis-auth.md`

## Problem Statement

When a citizen files a Report in the AGAP mobile app, the app sends the photo to the AGAP web service. The web service asks an AI model to describe it for responders. That service is open to anyone on the internet:

- It doesn't check who is calling.
- It doesn't limit how often it's called.
- It doesn't limit what it's sent.

Anyone who finds the address can send it unlimited images and spend the project's AI budget. The budget is paid by the research team. If it runs out or is abused, every citizen's Reports lose their photo descriptions, and the team gets an unexpected bill.

There's a second problem: many photos are probably already failing. The app sends the full-resolution camera photo, often several megabytes. Once it's converted to text for sending, it can exceed the hosting platform's request size limit. On many phones, citizens may silently get no description at all. Responders then see a Report with only the citizen's chips and note. The app also does that conversion slowly, on the phone's main JavaScript thread.

## Solution

Only people signed in to the AGAP app can get a photo description:

- Each person can request a fair number per hour.
- All users together have a daily ceiling that caps total spend.
- The app sends a small, resized copy of the photo, which is quick to upload, always under the size limit, and cheaper to describe.
- The photo stored with the Report stays at full quality, so responders still see every detail.

Nothing about sending a Report changes. Descriptions already run in the background and never block the Send button. If a description is refused for any reason, the review screen shows its existing "description unavailable" state and the Report sends normally with the citizen's chips, note, location and photo.

## User Stories

1. As a citizen filing a Report, I want my photo described automatically while I review it, so that responders understand the emergency before they arrive.
2. As a citizen, I want the description to keep working on a phone with a high-resolution camera, so that I'm not left without one just because my phone takes large photos.
3. As a citizen on a slow mobile connection, I want the app to upload only a small copy of my photo for the description, so that it arrives quickly and doesn't eat my data.
4. As a citizen, I want my Report to send even if the description is refused, slow or unavailable, so that a failure in an optional feature never delays help.
5. As a citizen, I want the review screen to say plainly when a description isn't available, so that I know to add details in my note instead.
6. As a citizen, I want my stored Report photo to stay at full quality, so that responders can zoom in on injuries or hazards.
7. As a citizen who retakes a photo a few times, I want a reasonable number of descriptions per hour, so that normal use never runs into the limit.
8. As a citizen whose sign-in has expired, I want the Report flow to keep working without a description, so that an expired session never blocks an emergency Report.
9. As a citizen, I want the app never to show me confusing technical errors such as "Invalid API key", so that I'm not alarmed by messages I can't act on.
10. As a responder viewing a Report on the web dashboard, I want the photo description present more often, so that I can triage faster.
11. As a responder, I want descriptions to come only from photos real citizens took in the app, so that I'm not reading output generated for unrelated callers.
12. As the project owner, I want only signed-in AGAP users to be able to request descriptions, so that strangers can't spend our AI budget.
13. As the project owner, I want a per-person hourly limit, so that one account can't drain the budget.
14. As the project owner, I want a daily ceiling across all users, so that the total spend is bounded even if many accounts are created to get around the per-person limit.
15. As the project owner, I want the service to refuse descriptions whenever it can't check the limits, so that an outage in the limit check never turns into unlimited spending.
16. As the project owner, I want the limits to be easy to find and change in one place, so that I can tune them for a pilot or a usability-test day without a redesign.
17. As the project owner, I want this protection to need no new paid services or secret keys, so that it fits a student research budget and doesn't add new secrets to leak.
18. As the project owner, I want the request log to clean itself up, so that it never grows without bound or holds data longer than the limit needs.
19. As the project owner, I want the request log hidden from the public API, so that no one can read who used the feature or when.
20. As the project owner, I want images that aren't JPEG or PNG refused before any AI call, so that the service can't be used to process arbitrary files.
21. As the project owner, I want oversized uploads refused before any AI call, so that large payloads can't be used to run up cost or tie up the service.
22. As the project owner, I want badly formed requests not to count against anyone's limit, so that broken clients don't lock out real users.
23. As the project owner, I want the AI provider's raw error messages kept off the public response, so that details about our provider account aren't exposed.
24. As the project owner, I want slow AI calls to be cut off after a fixed time, so that hung requests don't pile up or run past the hosting time limit.
25. As the project owner, I want server logs to record why a description failed, so that I can diagnose problems after a usability session.
26. As a usability-test facilitator, I want descriptions to work reliably on test-day devices, so that the study measures the app's design and not a flaky integration.
27. As a usability-test facilitator, I want the rollout order documented, so that I know the test build has to be updated before the server change ships.
28. As a maintainer, I want older app builds to fail gracefully, with Reports still sent but without descriptions, once the server requires sign-in, so that the change can't break the emergency flow for anyone.
29. As a maintainer, I want the endpoint's behaviour covered by automated tests, so that later changes can't quietly reopen it.
30. As a maintainer, I want the quota rules tested directly against the database function, so that the limit logic is proven and not just assumed through stubs.
31. As a maintainer, I want the README to explain that the endpoint needs a signed-in session and what the limits are, so that the next developer doesn't remove the check by mistake.
32. As the project owner, I want a reminder to set a monthly budget on the AI provider account, so that there's a final ceiling outside our code.

## Implementation Decisions

**The usage log**
- A new database table records one row per approved description request: who asked, and when.
- The API can't reach it: RLS is on with no policies, and all privileges are revoked from the anonymous and signed-in roles.
- Rows older than one day are removed as part of normal use. No scheduled job is needed.

**The quota function (`claim_photo_analysis`)**
- One database function takes no arguments and returns a status word: `ok`, `unauthenticated`, `user_limit` or `daily_limit`.
- It identifies the caller from their own session and returns `unauthenticated` if there is none.
- It serialises calls per user, so parallel requests can't slip past the limit.
- It checks two limits:
  - 10 requests per user in a rolling hour.
  - 300 requests across all users in a rolling 24 hours.
- It records the request only when it returns `ok`.
- The limits are named constants at the top of the function.
- It runs with elevated rights and a fixed, empty search path, because the daily ceiling has to count every user's rows.
- Only signed-in users can execute it. This follows the same pattern as the existing incident-claims function. The security advisor will list it as callable by signed-in users. That's intentional, since it can only use up the caller's own quota.

**One check for both sign-in and quota**
- The web service calls the quota function with the citizen's own access token.
- The database API rejects a forged or expired token before the function runs, and the function identifies the user from the same token.
- This one round trip covers identity and quota, with no service-role key and no external rate-limit store.

**The photo-description endpoint**

The request contract stays: a JSON body with an `image` field holding base64 image data. A leading `data:` prefix is accepted and stripped. The response stays `{ description }` on success and `{ error }` on failure.

New requirement: an `Authorization: Bearer <access token>` header.

Checks run in this order:

| Order | Check | Response |
|---|---|---|
| 1 | Header missing | 401 |
| 2 | Body isn't JSON, or `image` isn't a string | 400 |
| 3 | Image larger than about 1.5 MB once decoded | 413 |
| 4 | Not a JPEG or PNG, judged by its leading bytes | 415 |
| 5 | Quota check: token rejected, or `unauthenticated` | 401 |
| 6 | Quota check: `user_limit` or `daily_limit` | 429 with a `Retry-After` header |
| 7 | Quota check fails in any other way | 503, with no AI call (fail closed) |
| 8 | AI call fails or exceeds 25 seconds | 502 with a generic message; the detail goes to server logs only |

Further decisions:
- Validation (steps 2–4) runs before the quota check, so malformed requests never use up a user's quota.
- The image type sent to the AI comes from the detected bytes, not an assumption.
- The endpoint asks the host for up to 30 seconds of run time.
- The AI model, prompts and description style are unchanged.

**The mobile photo-description client**
- Before sending, the app makes a resized copy of the photo: width 1024, JPEG at about 70% quality.
- It uses the Expo image manipulation module that ships with the app's Expo SDK version. That's a new native dependency.
- The resizer does the base64 conversion natively, replacing the slow character-by-character conversion in JavaScript.
- The app attaches the current session's access token. With no session, it skips the request and the review screen shows "unavailable".
- Errors map to plain internal messages:
  - 401: not signed in.
  - 429: temporarily paused.
  - Anything else: generic.
- Misleading "Invalid API key" wording is removed. These messages are for logs; the review screen keeps its existing unavailable state.
- The existing 30-second client timeout and the return-nothing-on-failure behaviour are kept.

**Unchanged:**
- The Report review screen.
- Background description with a late attach after Send.
- The full-quality Storage upload.
- The Report record.

**Rollout**
- The database change ships first. On its own it changes nothing for users.
- The mobile build ships next. It works with the old endpoint, which ignores the extra header.
- The endpoint change ships last.
- The mobile change adds a native module, so testers need a new app build; an over-the-air update isn't enough.
- After the endpoint ships, older app builds stop getting descriptions, but their Reports still send.

## Testing Decisions

**What makes a good test here:** it exercises behaviour that a caller can observe, through a public contract:
- The status code and body the endpoint returns for a given request.
- The status word the quota function returns for a given history of requests.

Tests mustn't assert on internal helpers, call order inside the handler, or table layout beyond what the contract needs. A refactor that keeps the contract should keep every test green.

**Seam 1: the photo-description endpoint's contract (automated, Vitest)**

- **Setup:** add Vitest to the web app. Tests call the route's exported request handler directly with constructed requests.
- **Stubs:** both outbound dependencies, the database API (for the quota function) and the AI provider, are stubbed at the `fetch` boundary. No real network calls are made.
- **Cases:**
  - Missing header returns 401.
  - Non-JSON body or missing `image` returns 400.
  - Oversized image returns 413.
  - A non-image payload returns 415.
  - A token the database rejects returns 401.
  - `unauthenticated` returns 401.
  - `user_limit` and `daily_limit` return 429 with `Retry-After`.
  - A failing quota check returns 503, and the AI stub is never called.
  - An AI error returns 502, and the provider's message isn't in the body.
  - An AI timeout returns 502.
  - A valid JPEG and a valid PNG return 200 with the description, and the detected type is what the AI receives.
  - Invalid requests (400, 413, 415) never reach the quota stub.

**Seam 2: the quota function (SQL, in a transaction that rolls back)**

- **Setup:** run as the signed-in role with simulated session claims. Nothing persists.
- **Cases:**
  - Ten calls return `ok` and the eleventh returns `user_limit`.
  - Another user is unaffected by the first user's usage.
  - No session returns `unauthenticated`.
  - With 300 recent rows from other users, the next caller gets `daily_limit`.
  - Rows older than a day are cleaned up and don't count.
  - Signed-in and anonymous roles can't read or write the usage log directly.
  - The anonymous role can't execute the function.
- **After applying:** run the Supabase security advisor. The only new note should be the intentional "callable by signed-in users" one.

**Mobile (checked by hand)**
- The repo has no mobile test setup, and the change depends on the camera and native image processing. A facilitator checks it on a phone:
  - A photo gets a description on the review screen and the Report sends with it.
  - Signed out, or after hitting the limit, the screen shows "unavailable" and the Report still sends.
  - The stored Report photo is still full quality on the web dashboard.

**Prior art**
- The repo has no automated test suite, so Seam 1 introduces the first one, kept to this endpoint.
- Seam 2 follows the existing practice: hand-run SQL verification in the Supabase RBAC testing guide, and the rolled-back verification transactions used for the October 2026 role, approval and incident-claims migrations.

## Out of Scope

- Push notifications, the device QA sweep, and showing citizen notes or emergency contacts on the web dashboard.
- Changing the AI model, prompts, description length or image detail level.
- Describing photos for Emergency Alerts. Only Reports carry photos.
- An admin screen for viewing or changing limits, or per-office or per-role limits.
- Revoking access for a specific abusive account beyond the existing account controls.
- Moving the endpoint to a Supabase Edge Function or another host.
- Rate-limiting any other web route.
- A transition period in which the endpoint accepts requests without sign-in.
- Setting the AI provider's account budget. The project owner does that in the provider's dashboard.

## Further Notes

**Rollout and the test day**
- Before a usability session, confirm the test devices run a build that includes this change. Otherwise descriptions will be "unavailable" once the endpoint ships.
- The limits (10 per user per hour, 300 per day overall) are starting values. If a test day involves many participants on shared accounts, raise the per-user limit for that day.

**Cost**
- Resizing photos to width 1024 also lowers the AI cost per Report and the time to a description.

**Database**
- The migration should be applied to the live Supabase project only after Seam 2 passes, as with the previous migrations.
