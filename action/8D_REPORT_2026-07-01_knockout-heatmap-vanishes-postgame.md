# 8D Report — Match heatmap vanishes after full time (baked stats are deploy-gated)

**Ref:** 8D-2026-07-01-01
**Date raised:** 2026-07-01
**Raised by:** Johann (user) — "I used to have the heatmap during the game England v Congo. Now the game is over and the heatmap is also gone."
**Owner / coordinator:** Claude (recon unit)
**Severity:** High — a match-intelligence view that worked *during* a live game disappears the moment it ends. This is precisely the window the product exists for ("having this information aftermath has zero interest") — so losing it at full time is a direct hit to the core value.
**Status:** Root cause confirmed · Interim containment available (redeploy) · Durable corrective action proposed (runtime overlay for recently-finished fixtures) — **not yet implemented** (report only, per request)

---

## D1 — Team
- Johann Boucavel — product owner; detected the symptom immediately after England v Congo DR ended.
- Claude (recon unit) — investigation, root cause, corrective + preventive actions.

## D2 — Problem description
The Match Intelligence heatmap for **England v Congo DR** (knockout R32, fixture `1567307`) was present and updating **while the game was live**, then **disappeared entirely once the game finished** — no heatmap tab content, and the match dropped out of the picker.

- **Is:** A knockout (or group) fixture that is visible on the Match Intelligence screen *only via the live overlay* while in play becomes **completely absent** on the deployed client shortly after full time — the match is no longer selectable and its heatmap is gone.
- **Is not:** Not a broken model, not fabricated/missing stats (the stats exist and were even baked to git), not a bad web build, not a code regression this session. Not the bracket-card `🔥 Heatmap` button gating (that reads the same baked set and has the same latent exposure, but the reported symptom is the screen itself going empty).
- **Where:** `app/match-heatmap.tsx` ← `lib/useLiveStats.ts` (the match list) and the runtime `api/match-stats.ts` overlay vs. the baked `lib/matchStatsData.ts` (`KNOCKOUT_MATCH_STATS`).
- **When:** In the gap between (a) api-football dropping the just-finished fixture from its `live=all` feed, and (b) the next **code** deploy that rebuilds the client bundle with the freshly-baked stats. For England v Congo: game ~16:00 UTC 2026-07-01; stats baked to git at **17:22 UTC** (`a7c09fe`, `[skip ci]`); last deploy-triggering commit was **`0ab88b5`**, which predates the bake → the deployed bundle never received the game.
- **Magnitude:** Every knockout/group fixture whose stats are first baked by a `[skip ci]` bot commit *after* the last real deploy is exposed to this for the whole interval until the next code deploy. It is not a one-off; it is structural for any game that finishes between deploys.

## D3 — Interim containment
- The heatmap for a finished game **returns as soon as a code (non-data) deploy runs**, because that rebuilds the client bundle with the already-baked `KNOCKOUT_MATCH_STATS` entry. A stop-gap redeploy: push any non-`[skip ci]` commit (or an empty commit) so `vercel-should-build.sh` builds.
- The data itself is **not lost** — `1567307` is correctly baked in `KNOCKOUT_MATCH_STATS` (with stale `status: "LIVE", elapsed: 90`, see D7). The gap is purely *delivery to the client*, not data capture.
- Containment is temporary and manual; it does not stop the next finished game from vanishing.

## D4 — Root cause analysis

A finished-game heatmap has **two possible data sources on the client, and both fail during the gap:**

1. **Runtime overlay (`/api/match-stats`)** — fetches `?live=all` from api-football and keeps fixtures whose status is `LIVE` *or* `FT/AET/PEN`. But `live=all` only returns a just-finished fixture for a **short grace window**; once api-football drops it from `live=all`, the endpoint has **no way to see it** (there is no query for specific finished fixture ids). So the overlay stops returning the game a few minutes after full time.
2. **Baked bundle (`KNOCKOUT_MATCH_STATS` in `lib/matchStatsData.ts`)** — the game *is* baked, but the sync/auto-heal commit that baked it is **`[skip ci]`**, and `vercel-should-build.sh` deliberately **skips data-only commits**. So the baked entry sits in git but **never reaches the deployed client** until an unrelated code change triggers a rebuild.

**The failure is the overlap of the two:** while live, source (1) carries the game. At full time, source (1) lapses after the grace window, and source (2) has not been delivered to the client (deploy-gated). In that gap the client has **no entry at all** for the fixture → `useLiveStats()` doesn't contain it → `app/match-heatmap.tsx` can't list or render it → heatmap gone.

**5 Whys:**
1. *Why did the heatmap disappear at full time?* The finished fixture was no longer in `useLiveStats()` on the client.
2. *Why not?* Its only client-side source during play was the `/api/match-stats` live overlay, which stops returning it once api-football drops it from `live=all`.
3. *Why didn't the baked `KNOCKOUT_MATCH_STATS` cover it?* The baked entry exists in git but the commit that added it was `[skip ci]`, so the client bundle was never rebuilt with it.
4. *Why is baked data deploy-gated like that?* By design — data bots commit every few minutes with `[skip ci]` and `vercel-should-build.sh` skips data-only commits so high-frequency refreshes don't spam production builds (recon #18 era decision). Correct for *aggregates served at runtime*; wrong for *a per-match artifact that must survive the live→finished transition*.
5. *Why did it only surface now?* Group-stage games mostly finished close to deploys; a knockout tie finishing cleanly between deploys made the gap visible. It is the same **baked-vs-live / deploy-gated** class documented in recon #70, #58, and the 2026-06-18 standings and 2026-06-21 status bugs — applied here to *presence in the match list*, not just a value being stale.

**Root cause (one line):** A just-finished match's heatmap depends on baked stats that are **deploy-gated** (`[skip ci]` + ignored-build-step), while its only runtime source (`/api/match-stats`, `live=all`) **stops covering the game a few minutes after full time** — so between the grace window closing and the next code deploy, the client has no source and the match vanishes.

## D5 — Chosen permanent corrective action
**Give recently-finished fixtures a runtime source, so the client never loses the game across the live→finished transition** — mirroring the recon #70 overlay philosophy and the `statusOf()`/standings fixes (derive the live view from a runtime overlay, never a deploy-gated baked file).

Primary fix — extend `api/match-stats.ts` to also serve *recently-finished* fixtures by id, not just `live=all`:
- Alongside the `live=all` query, fetch `/fixtures/statistics` (or `/fixtures?ids=…`) for the **current/recent matchday's fixtures that are `FT/AET/PEN`** (e.g. finished within the last ~6–12h), and merge them into the `stats` payload.
- This keeps a just-ended game available via the overlay until the next code deploy carries the baked entry — no redeploy in the freshness loop, consistent with how the live path already works.
- Same treatment for the sibling recon #70 overlays (`api/match-events.ts`, `api/match-players.ts`) so Momentum/Pass Map/Players don't blank out at full time either.

Guardrails to preserve:
- Keep knockout stats in their own `KNOCKOUT_MATCH_STATS` export and merge only at the display layer (never widen `MATCH_STATS`, which feeds tournament aggregates).
- Bound the "recently finished" set (id list / time window) so upstream call volume stays flat — no unbounded fan-out.
- Honesty boundary unchanged: overlay only what the feed actually returns; no fabricated post-match stats.

## D6 — Implement & validate (planned — not yet done)
1. Add the recently-finished branch to `api/match-stats.ts`; bound it to the active matchday's fixture ids.
2. Validate parsed output against the live api-football feed for a just-finished tie (counts/xG match the scoreline) before shipping — per the recurring "validate a new endpoint's parsed output" rule.
3. Confirm on device: open Match Intelligence on a fixture immediately after full time and verify the heatmap **persists** (does not vanish) without a redeploy.
4. Extend the same window to `match-events` / `match-players` overlays; re-check the penalty-shootout `comments === 'Penalty Shootout'` filter still holds for finished KO ties.

## D7 — Prevent recurrence (systemic)
- **Secondary data bug found:** the baked `1567307` still reads `status: "LIVE", elapsed: 90` in `KNOCKOUT_MATCH_STATS`, and `WC_KNOCKOUT` (`knockoutData.ts`) also still says `status: 'LIVE'` — the game is over but the FINISHED status was never persisted. The live *status* is correctly owned by `useLiveResults` (`statusOf()`), so the screen shows FULL TIME while the overlay is alive; but once a game is only served from the baked file, a stale `LIVE` status resurfaces. The sync/auto-heal bots must persist `FINISHED` (and for KO ties, winner + penalties) once the fixture leaves `live=all` — confirm `sync-knockout.ts` / `sync-live-stats.ts` write the terminal status, not just the last in-play snapshot.
- **Watchdog rule:** extend `scripts/check-data-health.ts` to assert that a fixture which was LIVE and is now finished has a **baked `FINISHED` status** *and* is reachable on the client path — "right data at the right time" already covers finished→heatmap; add the status-terminal check.
- **Deploy-gating awareness:** document that any *per-match artifact that must survive live→finished* belongs on a runtime overlay, not a `[skip ci]`-baked file. Baked files remain correct for tournament aggregates (served at runtime) but must never be the *sole* client source for a live-then-finished element.
- Add this case to CLAUDE.md Known Issues so the "audit freshness per-element, and give live-then-finished elements a runtime source that covers the finished grace period" lesson is captured.

## D8 — Closure
- **Open:** durable corrective action (D5/D6) is proposed but **not implemented** — this deliverable is the report only.
- **Confirmed root cause:** deploy-gated baked stats + a runtime overlay that only covers `live=all`, leaving a coverage gap at full time.
- **Immediate recovery if needed now:** trigger a code (non-`[skip ci]`) deploy to rebuild the client bundle with the already-baked `1567307` entry; the heatmap returns.
- **Recognition:** correct instinct by Johann — the disappearance at full time is exactly the moment the feature matters, and it exposed a structural deploy-gating gap, not a one-off.

---
*Filed under `action/`. Related: recon #70 (live match-intelligence overlays), 8D-2026-06-15-01 (sync push race / data staleness), CLAUDE.md "baked vs live" fixes (2026-06-18 standings, 2026-06-21 status, recon #58/#70).*
