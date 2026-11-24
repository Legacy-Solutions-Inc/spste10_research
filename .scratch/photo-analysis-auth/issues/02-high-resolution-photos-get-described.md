# 02 — High-resolution photos get described

**What to build:** a citizen filing a Report from any phone, including one with a high-resolution camera, gets a photo description on the review screen.

The AGAP app sends the endpoint a small resized copy of the photo, quick to upload and always under the host's request limit. The endpoint refuses anything too large or not an image before spending on the AI.

The stored Report photo stays full quality. Sending a Report is unchanged and is never blocked by the description.

Spec: `docs/specs/photo-analysis-auth.md` (Implementation Decisions → photo-description endpoint, mobile photo-description client).

**Blocked by:** 01 — Test harness for the photo-description endpoint.

**Status:** ready-for-agent

- [x] The app uses the Expo image manipulation module at the version bundled with its Expo SDK. Installed through Expo's installer, with only the app's manifest and the matching lockfile changed.
- [x] Before requesting a description, the app makes a resized copy: width 1024, aspect kept, JPEG at about 70% quality. The resizer produces the base64; the character-by-character JavaScript conversion is gone.
- [x] The photo uploaded to Storage with the Report is still the original, full-quality capture.
- [x] The endpoint accepts `image` with or without a leading `data:` prefix.
- [x] Image size check: anything over about 1.5 MB once decoded returns 413, with no AI call.
- [x] Image type check, by leading bytes:
  - JPEG and PNG are accepted, and the detected type is the one sent to the AI.
  - Anything else returns 415, with no AI call.
- [x] Endpoint tests cover:
  - 413 for oversize, and 415 for a non-image payload.
  - The `data:` prefix accepted.
  - PNG passed to the AI as PNG.
  - A valid JPEG returns 200 with the description.
- [x] The app typecheck passes. The web lint, typecheck and tests pass.
- [ ] Manual check on a phone (Expo Go or a dev build pointed at the dev server):
  - A new Report photo gets a description on the review screen.
  - The Report sends with that description.
  - The web dashboard still shows the full-quality photo.

## Implementation prompt

Framework: RISEN (Role, Instructions, Steps, End goal, Narrowing). Paste everything inside the block into a fresh session.

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
