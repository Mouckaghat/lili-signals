# 8D Report — Sync bots fail silently on a push race, leaving live data stale

**Ref:** 8D-2026-06-15-01
**Date raised:** 2026-06-15
**Raised by:** Johann (user) — reported "Sync Live Match Stats — Failed in 32s", then "why is the heatmap for Spain v Cape Verde gone?", then "we are constantly troubleshooting — how come?"
**Owner / coordinator:** Claude (recon unit) — "you are in charge"
**Severity:** High — user-facing data goes silently stale during live matches (heatmap/players/results disappear for matches that have actually been played); recurring, not a one-off
**Status:** Contained (recon #13, `e595542`) · Corrective + preventive actions implemented (recon #14); monitoring now in place

---

## D1 — Team
- Johann Boucavel — product owner; detected the symptoms during live match days.
- Claude (recon unit) — investigation, root cause, corrective + preventive actions, coordination.

## D2 — Problem description
The `Sync Live Match Stats` GitHub Action reported **"Failed in 32 seconds."** Separately, the **Match Heatmap for Spain v Cape Verde was missing** even though the match had been played.

- **Is:** Multiple sync workflows intermittently fail at the final `git push`. When `sync-live-stats` fails, `lib/matchStatsData.ts` is not updated; matches that kick off after the last successful run never get stats, so their heatmap (gated on `MATCH_STATS` membership) and Players data never appear.
- **Is not:** Not a bug in any sync **script** (each is defensive — on fetch failure or empty data it leaves the file untouched and exits 0) and not a broken web build (`expo export -p web` exits 0 locally). Not caused by any application-code change this session.
- **Where:** All seven committing workflows (`sync-live-stats`, `sync-match-events`, `sync-standings`, `sync-fixture-results`, `sync-lineups`, `sync-squads`, `sync-injuries`) and, by the same mechanism, the manual `npm run ship`.
- **When:** During match windows, when several `*/5`-minute bots fire in the same minute. Confirmed timeline on 2026-06-15: match stats last committed **08:43 UTC**; Spain v Cape Verde kicked off **16:00 UTC**; at **18:27 UTC** the match was finished but absent from the data — a ~10-hour stall straddling kickoff.
- **Magnitude:** Observed 3× in a single session (the CI failure + two manual `ship` push rejections). Every post-08:43 match was missing its heatmap until manual backfill.

## D3 — Interim containment
- Ran `scripts/sync-live-stats.ts` **manually** (dry-run → live) to backfill all live/finished matches; restored Spain v Cape Verde + 12 others. Shipped as **recon #13 (`e595542`)**.
- The two manual pushes that lost the race were recovered the same way the permanent fix now automates: `git pull --rebase origin main` then push.
- Containment is temporary: data would go stale again at the next match without the corrective action below.

## D4 — Root cause analysis

**Technical cause.** Every sync workflow ends with a bare `git push` to `main`. During match windows, four workflows run on a `*/5` cron and frequently execute in the same minute. They all branch from the same `main` SHA, each commits a different generated file, and the **second push to land is rejected as non-fast-forward**. The step exits 1 with no retry, so the run fails after ~32s (all work done, only the push lost). The committed data is therefore left at the last winner's state.

**Why it kept costing us troubleshooting (5 Whys):**
1. *Why was the heatmap missing?* The match wasn't in `MATCH_STATS`.
2. *Why wasn't it there?* `sync-live-stats` hadn't committed since before kickoff.
3. *Why did it stop committing?* Its `git push` lost the race to a concurrent bot and the run failed.
4. *Why did that turn into a silent, hours-long stall?* Nothing retried the push, and **nothing watched the result** — a failed bot is only a red ✗ in the Actions tab that no one monitors.
5. *Why was there no watch?* There was no check linking the **schedule** ("a match is live now") to **data freshness** ("but stats are 10h old"). Failures were only ever discovered via a broken screen.

**Root cause (two-part):**
- *Reliability:* the one operation that matters (committing fresh data) had **no resilience** against an entirely predictable race.
- *Observability:* there was **no signal** for "right data at the right time," so every failure was invisible until it surfaced as a user-facing defect.

**Escape point:** Each bot treats a lost push race as a hard failure instead of a retryable, expected condition — and no monitor exists to catch the stale data it leaves behind.

## D5 — Permanent corrective action
1. **Resilient push (cure).** New `scripts/git-push-retry.sh`: on rejection it `git pull --rebase --autostash origin main` and retries (up to 5×, conflict-free because each bot writes a different file). Wired into **all 7** committing workflows in place of the bare `git push`.
2. **Data-health watchdog (detection + self-heal).** New `scripts/check-data-health.ts` compares `WC_FIXTURES` against the committed feeds and flags: a live match with no/stale stats (CRITICAL), a finished match missing from stats or results, and a missing starting XI within ~40 min of kickoff (warnings). New `.github/workflows/data-health.yml` runs it every 10 min during the tournament; on a problem it **auto-heals** (re-runs the relevant sync bots, commits via the retry push) then **re-checks** — and if a critical issue survives, it **fails the run so GitHub emails the owner** (no SMTP secret required).

## D6 — Implement & validate
- Implemented in **recon #14** (push-retry script + 7 workflow edits + health script + watchdog workflow).
- `tsc --noEmit` clean.
- Health check run live (2026-06-15 18:39 UTC): 72 fixtures checked, 0 critical, **1 warning correctly surfaced** — "Spain v Cape Verde Islands: finished but no recorded result" (feed flagged for heal: `results`). The watchdog detected a genuine residual gap on its first run, confirming the schedule↔data wiring works.
- Containment backfill (recon #13) already verified Spain v Cape Verde's stats/heatmap are restored.

## D6b — Follow-on finding (during validation)
While validating the watchdog, its `results` warning prompted a local run of `sync-fixture-results.ts`, which exposed a **separate latent landmine** in that script (recon #15):
- It read only `API_FOOTBALL_KEY` (no `API_KEY` fallback) and loaded only `.env.local` (not `.env`) — inconsistent with `sync-live-stats.ts`, so it couldn't run locally.
- **Critically, on fetch failure it wrote an *empty* results file** rather than leaving the curated data untouched — i.e. a transient API/secret failure in CI would have *wiped every recorded result*.
- Fixed: added the `API_KEY` fallback + `.env` load, and made it leave the file untouched on fetch failure **and** when the result map is empty (matching the defensive pattern in `sync-live-stats.ts`). Re-ran live: 13 finished results written, Spain v Cape Verde (0–0) recorded, **health check now 0 critical / 0 warning**.

## D7 — Prevent recurrence
1. **Retry-by-default:** all current and future sync bots use `scripts/git-push-retry.sh`; a lost race is now a non-event. New sync workflows must call it, never a bare `git push`.
2. **Standing monitor:** `data-health.yml` is the "constant check" — it will catch any future staleness (including feeds not yet covered) and self-heal or alert, instead of waiting for a user to spot a broken screen.
3. **Defensive-write standard:** a sync bot must NEVER overwrite curated data with empty/partial output on failure — leave the committed file untouched (as `sync-live-stats` and now `sync-fixture-results` do). **Open audit:** apply the same review to `sync-standings`, `sync-match-events`, `sync-squads`, `sync-lineups`, `sync-injuries` for the same destructive-on-failure pattern.
4. **Open / recommended:** consider a shared `concurrency` group only if rebase-retry proves insufficient (rejected as primary fix because GitHub would drop queued runs — bad for a 5-min live feed). Extend the health check with lineup-confirmation and standings freshness if those feeds later show gaps.

## D8 — Closure
- Root cause addressed at both layers: pushes no longer fail on contention, and a monitor now guarantees "right data at the right time" with auto-heal + alert.
- Lessons: (1) for any operation on a shared branch under concurrency, treat push rejection as expected and retryable, not fatal; (2) a data pipeline without a freshness monitor will always be debugged reactively, through its symptoms.
- Recognition: surfaced by the user connecting three separate symptoms (CI failure → missing heatmap → "why do we keep troubleshooting") into one systemic question — which is exactly what reframed this from a one-off fix into a reliability+observability correction.
