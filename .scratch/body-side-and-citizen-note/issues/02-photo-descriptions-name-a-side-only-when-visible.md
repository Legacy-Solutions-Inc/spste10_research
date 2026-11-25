# 02 — Photo descriptions name a side only when the photo shows it

**What to build:** a responder reading a photo description can trust any left or right it gives. The side is always the injured person's own. The AI names a side only when the photo shows which way the person is facing. Otherwise it says the side can't be told, so the responder checks on arrival instead of acting on a guess.

Spec: `docs/specs/photo-analysis-auth.md` (Addendum: Body side and the Citizen note). Terms: `CONTEXT.md`.

**Blocked by:** None — can start immediately. It can run alongside 01.

**Status:** done

- [x] The AI instructions carry the body-side rule. This wording encodes the decision and may be tightened, but not changed in meaning:

  > Body side: give left and right as the injured person's own left and right, never as they appear in the image. A person facing the camera has their left side on the right of the image. Name a side only when the photo shows which way the person is facing, for example when their face or the front of their body is visible and the injured part is clearly attached to it. Otherwise say the side can't be told from the photo, for example "deep cut on one forearm; which arm can't be told from the photo". If both sides are injured, say both. This applies to every body part with a side: arms, legs, hands, feet, eyes, ears, and sides of the head, chest or torso.

  Tightened only: the list of body parts with a side moved to the front of the rule, so "Otherwise say the side can't be told" can't be read as applying to scenes with no person or to parts with no side.

- [x] The location guideline no longer gives side-specific examples such as "left arm" or "right side of forehead" that invite guessing. It points to the body-side rule instead.
- [x] The rest is unchanged: the model, the description length, the response shape, sign-in, limits, image checks and the timeout.
- [x] All existing endpoint tests pass unchanged. No test asserts on the instruction text.
- [x] The web lint, typecheck and tests pass.

## Implementation prompt

Framework: RISEN (Role, Instructions, Steps, End goal, Narrowing). Paste everything inside the block into a fresh session.

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
