# 01 — Responders see the Citizen note

**What to build:** a responder opening or scanning a Report on the web dashboard sees what the citizen tapped and typed, ahead of the AI's words.

The citizen's chips ("Unconscious", "Heavy bleeding", "Not breathing", "Vehicle accident", "Fire") and typed note are already saved with every Report. Today the dashboard never shows them. Each heading should make it clear who wrote what: "Citizen note" for the citizen's own words, "AI photo description" for the AI's.

Spec: `docs/specs/photo-analysis-auth.md` (Addendum: Body side and the Citizen note). Terms: `CONTEXT.md`.

**Blocked by:** None — can start immediately. It can run alongside 02.

**Status:** ready-for-agent

- [x] The Report detail panel shows, in order: Photo, Citizen note, AI photo description, Reported by, Timeline.
- [x] Citizen note section:
  - Chips appear as badges, with the typed text below, keeping its line breaks.
  - With no note, it says "No note was added."
- [x] The old "Description" heading reads "AI photo description". When empty it says "No photo description."
- [x] Queue and History rows for a Report show the Citizen note when there is one. Otherwise they fall back to the photo description, then "From {name}", then "Photo report".
- [x] Reading the note follows the app's format: the first line counts as chips only when every item on it is one of the five known chip labels. Otherwise the whole note is typed text.
- [x] Tests on plain functions cover:
  - Reading a note: none, chips only, typed text only, chips plus multi-line text, and a first line with an unknown item.
  - The one-line row summary: chips plus text, text only, no note with a photo description, and neither.
- [x] SOS alert rows and panels are unchanged.
- [x] No database change, no app change, and no new dependency or test tool.
- [x] The web lint, typecheck and tests pass.
- [ ] Owner's visual check: a Report with chips and a typed note looks right in the queue, the detail panel and History.
  - Not done yet: needs a responder sign-in. A one-off server render of the detail panel and Queue rows (not kept) showed the order, badges, line breaks, empty texts and row summaries as specified.

## Implementation prompt

Framework: RISEN (Role, Instructions, Steps, End goal, Narrowing). Paste everything inside the block into a fresh session.

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
