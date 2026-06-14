# 8D Report — Goal-scorers missing from the scorer list

**Ref:** 8D-2026-06-14-01
**Date raised:** 2026-06-14
**Raised by:** Johann (user) — detected the defect
**Owner:** Claude (recon unit)
**Severity:** Medium — data correct in storage, but user-facing list incomplete; trust impact (I had reported the work "done")
**Status:** Corrected (recon #3, `886b90a`); prevention actions open

---

## D1 — Team
- Johann Boucavel — product owner, detector of the defect.
- Claude (recon unit) — implementer / investigator / corrective action.

## D2 — Problem description
After I reported the match-data work complete and stated the Scorer Quality Standard was "held," the user noticed that the **Switzerland scorer (Breel Embolo) and the Qatar scorer (Boualem Khoukhi) were not on the scorer list** in the app.

- **Is:** 18 distinct goal-scorers exist in the data; only 10 appeared on the list. 8 were hidden (Reyna, Embolo, Khoukhi, Saibari, Vinícius Jr, McGinn, Irankunda, Metcalfe).
- **Is not:** The goals themselves were not missing or wrong — `lib/matchEventsData.ts` correctly held Embolo (17', pen) and Khoukhi (90+4'), and both had full profiles.
- **Where:** Web "Top Scorers" tab, served by `api/tournament-intelligence.ts`.
- **When:** Visible from the first time the list exceeded 10 scorers (matchday 1 complete).
- **Magnitude:** 8 of 18 scorers (44%) silently dropped.

## D3 — Interim containment
None deployed separately — the permanent fix was small and safe enough to apply directly (see D5/D6). Until redeploy, the workaround would have been "the list is capped; missing names are real and recorded."

## D4 — Root cause analysis

**Technical cause.** `api/tournament-intelligence.ts` built the scorer list with `...sort((a,b) => b.goals - a.goals).slice(0, 10)`. With 18 scorers and all but one tied on a single goal, ties were ordered by match sequence; Qatar–Switzerland was the 5th match, so its scorers landed at positions #12–13 — below the top-10 cut.

**Why it escaped my "done" claim (5 Whys):**
1. *Why were the scorers missing?* The API truncated the list to the top 10.
2. *Why did that hide legitimate scorers?* Nearly all scorers were tied on 1 goal, so the cut-off was decided by match order, not merit.
3. *Why didn't I catch it before saying "done"?* I verified only the **data layer** — that goals were written to `matchEventsData.ts`, that scorers joined to profiles, and that the bot reported "0 missing-profile warnings." I never exercised the **presentation/consumer layer** (the API output or the rendered list).
4. *Why did I stop at the data layer?* My working definition of "done" was "data is correct and live-verified." I treated *data correct* as a proxy for *feature correct* and did not trace the data to its consumers.
5. *Why was my definition narrower than the user's?* I optimised for checks I could run fast (bot warnings, grepping data files) and never rendered or queried the actual artifact the user sees.

**Root cause (process):** Verification scope ended at data generation, not at the user-facing output. The truncation lived downstream of where I looked, so it escaped.

**Escape point:** The moment I declared the Scorer Quality Standard "held" on the strength of "0 missing-profile warnings," without checking that every scorer actually appears on the list.

## D5 — Permanent corrective action
Removed the `.slice(0, 10)` cap in `api/tournament-intelligence.ts` so the **full Golden Boot race** is returned (sorted by goals; ties remain chronological by match). The UI already renders the entire list it receives, so no component change was required.

## D6 — Implement & validate
- Change committed and pushed as **recon #3** (`886b90a`).
- Validated: recomputed from `MATCH_EVENTS` → 18 distinct scorers, all now returned; Embolo and Khoukhi present. `tsc --noEmit` clean.
- Caveat recorded: the scorers tab is **web-only** (native returns empty) and is served by a Vercel function, so the fix is live only **after Vercel redeploys** from the push.

## D7 — Prevent recurrence
1. **Definition of Done change (committed behaviour):** for any data work, verify the **consumer/output** the user sees — render it or hit the endpoint — not just the data file. When reporting "done," state explicitly *what was verified and at which layer*.
2. **Audit completed:** searched `api/` and `lib/` for other `.slice(0, N)` caps. The team leaderboards (`bestAttack`, `bestDefence`, `mostDangerous`, `liliSurprise`, cards) cap at 7 — these are **intentional top-7 boards**, not completeness lists, so left as-is but noted as the same pattern. `worldSignals`/`groupDrama` caps are by design.
3. **Proposed (needs your go-ahead, would be recon #4):** extract the scorer computation into a pure function in `lib/` and add an invariant check — `distinct scorers in MATCH_EVENTS === scorers returned` — so any future silent truncation fails fast in CI. Not done yet to avoid an unrequested refactor.

## D8 — Closure
- Defect corrected and verified at the data + API layers; pending Vercel redeploy for full closure on web.
- Lesson: "the data is correct" ≠ "the feature is correct." Trust is rebuilt by verifying the user-facing artifact, and by reporting the limits of what was checked.
- Recognition: caught by the user's review — exactly the check that should have been mine.
