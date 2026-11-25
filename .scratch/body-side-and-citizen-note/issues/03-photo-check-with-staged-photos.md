# 03 — Photo check with staged photos

**What to build:** evidence that the new body-side rule works on real photos with a known correct answer. The owner stages five photos of a marked arm. Each runs twice through the local photo-description endpoint, signed in as the test citizen. It passes only if all ten answers match what's expected.

If the facing-camera cases fail, the owner uses this evidence to decide whether to switch to a stronger model. That decision isn't part of this ticket.

Spec: `docs/specs/photo-analysis-auth.md` (Addendum: Body side and the Citizen note → Testing).

**Blocked by:** 02 — Photo descriptions name a side only when the photo shows it. It also needs the owner's five photos.

**Status:** ready-for-agent

- [ ] The owner has staged five photos, kept outside the repo, with a bandage or pen mark on a known arm:

  | Photo | Expected |
  |---|---|
  | a. Close-up of just the marked arm | Side can't be told; no side named |
  | b. Someone else photographs the owner facing the camera, mark on the owner's left arm | Left |
  | c. The same, mark on the owner's right arm | Right |
  | d. The owner photographs their own marked forearm | Side can't be told; no side named |
  | e. A scene with no person | No side mentioned |

- [ ] Each photo is sent as an upright JPEG copy, resized like the app's (width 1024, about 70% quality), and checked by eye first.
- [ ] Each photo runs twice, signed in as the test citizen, against the local dev server with the new instructions.
- [ ] Results are recorded in this ticket: photo, expected, the side wording from each run, and pass or fail.
- [ ] All ten answers match.
- [ ] The usage records the check created are deleted afterwards, for the test citizen only.
- [ ] No photo, password or access token is written to the repo or this ticket.

## Results

_Filled in by the check._

Not run yet: deferred by the owner on 2026-11-25, with no photos staged. Ticket 02's body-side rule is untested on real photos, including whether the AI gets the left/right flip right when the person faces the camera (photos b and c). No usage rows were created and nothing was sent to the AI.

## Implementation prompt

Framework: RISEN (Role, Instructions, Steps, End goal, Narrowing). Paste everything inside the block into a fresh session.

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
