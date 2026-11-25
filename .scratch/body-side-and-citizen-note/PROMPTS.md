# Body side and Citizen note: implementation prompts

Each prompt is RISEN-structured (Role, Instructions, Steps, End goal, Narrowing). Paste one into a fresh Claude Code session at the repo root. The ticket files in `issues/` hold the acceptance criteria and the same prompts.

## Run order

| Ticket | Blocked by | Status |
|---|---|---|
| 01 — Responders see the Citizen note | None | Ready |
| 02 — Photo descriptions name a side only when the photo shows it | None | Ready |
| 03 — Photo check with staged photos | 02, and your five photos | Waiting on 02 |

## Good to know

- Every prompt works on the branch that's already checked out (`fix/photo-analysis-auth`). None creates, switches or deletes branches.
- Nothing is committed. Each session leaves its changes uncommitted and suggests a commit message in its report.
- 01 and 02 can run at the same time. They touch different files: 01 the dashboard, 02 the AI instructions.
- 03 makes ten real AI calls (a cent or two). It asks you for the photo folder, which photo is which, and the test citizen password. It never writes the password into a file.
- Before 03, stage the five photos and keep them **outside the repo** (for example in a folder on your Desktop):
  - a. a close-up of just the marked arm;
  - b. someone else photographs you facing the camera, with the mark on your **left** arm;
  - c. the same, with the mark on your **right** arm;
  - d. you photograph your own marked forearm;
  - e. a scene with no person.
- If 03 fails on the facing-camera photos (b or c), you decide whether to switch to a stronger model; the session won't change it.
- You do the visual check for 01 yourself, as a signed-in responder.
- Clear the context between tickets.

## 01 — Responders see the Citizen note

```
You are a senior TypeScript and React engineer working in the AGAP monorepo at "/Users/rafaeliiiprudente/Documents/coding projects/spste10_research" (pnpm 8 + Turborepo; apps/web is the responder dashboard, built with Next.js 14 App Router, Tailwind and shadcn/ui). Your job is ticket 01 of the body-side work: show responders the Citizen note (the chips and text a citizen adds to a Report) ahead of the AI photo description.

Work test-first on plain functions: write failing Vitest tests for reading the note and choosing the row summary, then make them pass, then wire the functions into the screens. The web test setup runs in a node environment and only tests plain logic; do not add component-rendering tools. Use the project's terms from CONTEXT.md (Citizen note, Photo description, Body side) in names, comments and labels.

1. Read:
   - .scratch/body-side-and-citizen-note/issues/01-responders-see-the-citizen-note.md (your acceptance criteria);
   - the Addendum at the end of docs/specs/photo-analysis-auth.md, and CONTEXT.md;
   - apps/web/src/types/incident.ts (ReportRow, Incident, and where a Report row becomes an Incident);
   - apps/web/src/components/incident/IncidentDetail.tsx, apps/web/src/app/dashboard/IncidentQueue.tsx and apps/web/src/app/history/HistoryClient.tsx (the Report detail panel and the two row summaries);
   - apps/web/src/components/ui/badge.tsx;
   - read only: apps/mobile/src/screens/report/ReportScreen3.tsx, for the five chip labels (DETAIL_CHIPS) and how the note is stored (chips joined with ", " on the first line, then the typed text, which can have several lines);
   - the existing tests in apps/web/test, to match their style.
2. Run git status and git branch --show-current, and work on the branch that's already checked out (it should be fix/photo-analysis-auth). Do not create or switch branches. Ticket 02 may be in progress in the same working tree and edits the photo-description endpoint; leave that file and any other changes you didn't make alone.
3. Write the tests first, in a new file under apps/web/test, against a new module of plain functions in apps/web/src/lib:
   - reading a note into chips and typed text: null, empty or whitespace gives no note; chips only; typed text only; chips plus multi-line typed text; a first line containing any item that isn't one of the five labels is treated as typed text in full; surrounding whitespace is trimmed;
   - the one-line summary for a Report row: chips joined with ", ", then "; ", then the typed text with line breaks collapsed to single spaces (for example "Not breathing, Heavy bleeding; fell off a ladder"); text only; no note falls back to the photo description; no note and no photo description gives "From {name}", or "Photo report" when there is no name.
   Assert only on returned values.
4. Implement:
   - add the user_note column to ReportRow, and a citizen_note field on Incident filled from it everywhere a Report row becomes an Incident (search for every such place);
   - the plain functions, keeping the five chip labels in one constant with a comment that they mirror the app's chips;
   - in the Report detail panel: order Photo, Citizen note, AI photo description, Reported by, Timeline. Citizen note shows chips with the existing Badge component and the typed text below with line breaks kept; empty shows "No note was added.". Rename the "Description" heading to "AI photo description"; empty shows "No photo description.";
   - make the Queue and History rows use the summary function for Reports, so both read the same way.
   Match the existing section and row styling. Don't change SOS alert rendering.
5. Run pnpm --filter web test, pnpm --filter web lint and pnpm --filter web exec tsc --noEmit, and fix anything you broke. Confirm the output shows the new tests actually ran.
6. You can't sign in as a responder, so leave the owner's visual check unticked, and in your report tell the owner how to check it: file a Report from the app with a chip and a typed note, then look at the queue row, the detail panel and History.
7. Tick the criteria you've met in the ticket file. Set Status to done only if every criterion is met; otherwise leave it and say what's left. Do not stage, commit or push anything: leave all changes uncommitted for the owner to review, and suggest the commit message "feat(web): show the Citizen note to responders and label the AI photo description" in your report.

You're done when:
- the new tests and all earlier tests pass;
- lint and typecheck pass;
- the detail panel, Queue rows and History rows follow the ticket;
- every change is left uncommitted on the current branch.

Limits:
- Do not change the database, the mobile app or the photo-description endpoint (ticket 02).
- Do not add dependencies or test tooling (no jsdom, Testing Library, Playwright or similar).
- Do not change SOS alert rows or panels, or add a body-side field anywhere.
- Do not touch .env files or put secrets in any file.
- Do not create, switch, rename or delete branches.
- Do not stage, commit or push anything, and don't open a pull request.

Finish with a short report:
- files changed, and a suggested commit message;
- the test, lint and typecheck results;
- every place a Report row becomes an Incident, and how you covered each;
- the owner's visual-check steps;
- anything you couldn't verify.
```

## 02 — Photo descriptions name a side only when the photo shows it

```
You are a senior engineer who writes instructions for vision AI models, working in the AGAP monorepo at "/Users/rafaeliiiprudente/Documents/coding projects/spste10_research" (pnpm 8 + Turborepo; apps/web is Next.js 14 App Router). Your job is ticket 02 of the body-side work: change the photo-description AI instructions so any left or right is the injured person's own, and a side is named only when the photo shows which way the person is facing. Otherwise the description says the side can't be told.

This is an instructions-only change. Responders read the photo description as-is, so a wrong side is worse than none. Use the project's terms from CONTEXT.md (Body side, Photo description).

1. Read:
   - .scratch/body-side-and-citizen-note/issues/02-photo-descriptions-name-a-side-only-when-visible.md (your acceptance criteria, including the rule's wording);
   - the Addendum at the end of docs/specs/photo-analysis-auth.md, and CONTEXT.md;
   - the endpoint handler at apps/web/src/app/api/analyze-photo/route.ts, especially SYSTEM_PROMPT and USER_PROMPT, and the tests in apps/web/test.
2. Run git status and git branch --show-current, and work on the branch that's already checked out (it should be fix/photo-analysis-auth). Do not create or switch branches. Ticket 01 may be in progress in the same working tree and edits dashboard files; leave those and any other changes you didn't make alone.
3. Edit SYSTEM_PROMPT:
   - add the body-side rule from the ticket as its own numbered guideline, keeping its meaning exactly (you may tighten the wording);
   - in the location guideline, replace the side-specific examples ("right side of forehead", "left arm") with side-free ones (for example "forehead", "lower leg", "vehicle interior", "roadside") and point to the body-side guideline;
   - renumber the guidelines if needed, and keep every other guideline as it is.
   Leave USER_PROMPT, the model, the length guidance, the response shape, sign-in, limits, image checks and the timeout untouched.
4. Do not add tests that assert on the instruction text; the endpoint tests check behaviour only. Run pnpm --filter web test, pnpm --filter web lint and pnpm --filter web exec tsc --noEmit, and confirm the output shows the tests actually ran.
5. Make no real AI calls. Ticket 03 checks the new instructions with staged photos.
6. Tick the criteria you've met in the ticket file and set Status to done. Do not stage, commit or push anything: leave all changes uncommitted for the owner to review, and suggest the commit message "fix(web): name a body side only when the photo shows it" in your report.

You're done when:
- SYSTEM_PROMPT carries the body-side rule and no side-specific location examples;
- the diff touches only the instruction text (and the ticket file);
- all tests, lint and typecheck pass;
- every change is left uncommitted on the current branch.

Limits:
- Do not change the model, USER_PROMPT, the length guidance or anything outside the instruction text.
- Do not touch dashboard files (ticket 01), the mobile app, the database or .env files, or put secrets in any file.
- Do not make real AI calls.
- Do not create, switch, rename or delete branches.
- Do not stage, commit or push anything, and don't open a pull request.

Finish with a short report:
- files changed, and a suggested commit message;
- the final body-side guideline as written;
- the test, lint and typecheck results;
- anything you couldn't verify.
```

## 03 — Photo check with staged photos

```
You are a QA engineer verifying AI output in the AGAP monorepo at "/Users/rafaeliiiprudente/Documents/coding projects/spste10_research" (apps/web is Next.js 14; the database is the live Supabase project lmthlfqfbhuspsecpdgx). Your job is ticket 03 of the body-side work: check, with five staged photos where the correct side is known, that photo descriptions name a body side only when the photo shows it, and name the correct one.

This ticket changes no code. Judge strictly: a wrong side is the outcome we're guarding against, so a guessed side counts as a fail even if it happens to be right. Body side always means the injured person's own left or right (see CONTEXT.md).

1. Read .scratch/body-side-and-citizen-note/issues/03-photo-check-with-staged-photos.md (your acceptance criteria and the expected answers), the Addendum at the end of docs/specs/photo-analysis-auth.md, and CONTEXT.md.
2. Run git status and git branch --show-current, and stay on the branch that's checked out (it should be fix/photo-analysis-auth). Do not create or switch branches. Confirm ticket 02 is done: SYSTEM_PROMPT in apps/web/src/app/api/analyze-photo/route.ts contains the body-side rule. If not, stop and report.
3. Ask the owner, and wait for the answers:
   - the folder holding the five photos (it must be outside the repo), and which file is photo a, b, c, d and e;
   - confirmation that the mark is on the owner's left arm in photo b and their right arm in photo c;
   - the password for the test citizen account qa.citizen@agap.test.
   Never write the password or any access token to a file, the ticket or your report, and never echo them.
4. Prepare the photos in your session scratchpad, never in the repo: make an upright JPEG copy of each at width 1024 and about 70% quality (on macOS, sips can convert and resize). Look at each copy to confirm it's upright and the mark is visible, and that each is under 1.5 MB.
5. Set up:
   - check apps/web/.env.local defines OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, without printing their values;
   - start the web dev server (pnpm --filter web dev) unless it's already running on localhost:3000;
   - sign in as the test citizen through the Supabase password-grant endpoint (auth/v1/token?grant_type=password) with the anon key, keeping the access token in a shell variable only;
   - with the Supabase MCP execute_sql tool, count the test citizen's rows in public.photo_analysis_requests from the last hour. The limit is 10 per hour; if any rows would stop ten runs, delete only the test citizen's rows.
6. Send each photo twice to POST http://localhost:3000/api/analyze-photo with "Authorization: Bearer <token>" and the JSON body {"image": "<base64>"}. Record each status code and description.
7. Judge each answer against the expected table:
   - a and d pass only if the description says the side can't be told and names no side;
   - b passes only if it names the left arm as the person's own; c only if it names the right arm;
   - e passes only if no side is mentioned.
8. Clean up: delete the test citizen's rows from public.photo_analysis_requests created by this check (that user only), stop the dev server if you started it, and delete the scratchpad copies.
9. Fill in the Results section of the ticket with a table: photo, expected, run 1 and run 2 side wording (short quotes), and pass or fail. If all ten pass, tick the criteria and set Status to done. If any fail, leave Status as is and do not change the instructions or the model; the owner decides what happens next. Do not stage, commit or push anything, and suggest the commit message "test: record the body-side photo check" in your report.

You're done when:
- all ten runs are recorded and judged in the ticket;
- the usage rows created by the check are deleted and the dev server is stopped;
- nothing secret or personal is in the repo;
- the ticket file is the only change, left uncommitted on the current branch.

Limits:
- Do not change any code, the AI instructions, the model or the limits.
- Do not store the photos, password or access token anywhere in the repo, and don't print the API key or token.
- Delete usage rows for the test citizen only, and change nothing else in the database.
- Do not create, switch, rename or delete branches.
- Do not stage, commit or push anything, and don't open a pull request.

Finish with a short report:
- the results table and the overall pass or fail;
- for any fail, the exact wording and what it suggests (for example, the facing-camera flip);
- confirmation that cleanup is done;
- anything you couldn't verify.
```
