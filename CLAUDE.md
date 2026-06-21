# lili_signals — Project Memory
# Claude: read this before touching ANYTHING in this project.

## Project Overview
- What it does: "Worldcupilou" — a football companion app for the 2026 World Cup. Predict scores, play against the in-app predictor ("Lili"), follow a favourite team's journey, and explore tournament intelligence (routes, group drama, stadiums, confederations, world signals).
- Status: Active development. Shipping as iOS/Android (EAS) + web (Vercel). Currently version 1.0.0, build 3.
- **This is an Expo / React Native (TypeScript) app, NOT Python** — ignore the `25 I Python` folder name. There is no venv and no `main.py`.
- Main entry point: `expo-router/entry` (file-based routing). Screens live in `app/`; `app/index.tsx` is the home screen and `app/_layout.tsx` the root layout.

## Session Start Checklist
1. Read this file top to bottom
2. Check `git status`
3. Confirm `node_modules` is installed (`npm install` if missing) — there is NO Python venv
4. Ask "what are we working on today?" before starting anything

## Run / Build / Sync
- Dev: `npx expo start` (scan QR in Expo Go), or `npm run ios` / `npm run android` / `npm run web`
- Web build: `npm run build` (`expo export -p web` → `dist/`), deployed via Vercel (`vercel.json`)
- Live data sync scripts (run with `tsx`, need API key in `.env`):
  - `npm run sync:live` (live scores) — `:dry` and `:test2022` variants exist
  - `npm run build:wc-data` (rebuild generated WC data)
  - other `scripts/sync-*.ts`: fixture results, standings, squads, lineups, injuries, match events, sheets

## Data Architecture
- Tournament data is **pre-built into TypeScript files in `lib/`** (e.g. `standingsData.ts`, `fixtureResultsData.ts`, `playerProfilesData.ts`, `wc-data-generated.ts`) so the app runs with zero runtime lookups. The `scripts/sync-*.ts` bots refresh these files from the live feed.
- Two data sources: the app's launch health check hits **football-data.org v4** (`lib/apiClient.ts`); the **api-football** feed (key in `.env` as `API_KEY`) powers the sync bots.
- No key / network error → app falls back to demo data (`lib/demoData.ts`); all screens stay functional.
- Serverless API routes for web live in `api/` (live scores, lineups, fixture results, tournament intelligence), with Upstash Redis (`lib/redis.ts`) as KV cache.

## Scoring System
- Exact score = 3 pts · Correct result (W/D/L) = 1 pt · Wrong = 0. Logic in `lib/scoring.ts`.

## i18n
- Multilingual via `lib/i18n.ts` + per-domain `*I18n.ts` files (player, stadium, confederation, world signals, travel notes). Keep new user-facing strings translated. See memory `project_i18n_integration.md`.

## Known Issues & Fixes Log
<!-- ### [YYYY-MM-DD] — Issue title
Symptom / Root cause / Fix / Lesson -->
### 2026-06-13 — api-football name/own-goal mismatches
Symptom: live scoring mismatched on abbreviated player names and own goals. Fix: resolve abbreviated names + attribute own-goal to correct team (commit 6bd3db9, live-validated). Lesson: validate sync bots against the live feed before trusting output.

### 2026-06-14 — Match Heatmap had no UI entry point
**Symptom:** The `/match-heatmap` screen (shipped in recon #2) was registered in `app/_layout.tsx` but nothing in the app linked to it — only reachable by typing the URL.
**Root cause:** Screen + route registered, but no nav button/drawer entry was ever wired in.
**Fix:** Added a `🔥 Heatmap →` pill to each match row in `components/MatchTimelineSection.tsx` (shown on `worldcup-table`). It `router.push`es `{ pathname: '/match-heatmap', params: { fixtureId } }`; the screen reads `fixtureId` via `useLocalSearchParams` and preselects that game (`selected ?? fixtureId`, so a tab tap still overrides). Added `tlHeatmap` to all 11 i18n languages.
**Lesson:** Only render a feature's entry point for data that exists — the button is gated by `FIXTURES_WITH_HEAT = new Set(MATCH_STATS.map(m => m.fixtureId))` (9 played/live games) so a tap never lands on the empty "No match stats yet" screen. The heatmap is a *model* from full-match aggregates (possession/shots/xG in `lib/heatmap.ts`), so it works for FINISHED matches too — that's its best use, not just live.

### 2026-06-14 — Expo typed routes go stale after adding a screen
**Symptom:** `tsc --noEmit` errored: `'/match-heatmap' is not assignable` to the generated route union, even though the route exists and works.
**Root cause:** Expo Router's typed-route union is generated output that only refreshes on `expo start`; a screen added in a prior session left the types stale.
**Fix:** Cast the nav call `as any` — the existing codebase convention (see `app/index.tsx:404`). Route is valid; types regenerate on next `expo start`.
**Lesson:** A stale typed-route error on a route you know exists is not a real bug — cast `as any` per convention, don't restructure navigation.

### 2026-06-15 — Pass Map blank for a live, not-yet-baked match (Sweden v Tunisia)
**Symptom:** The 🕸 Pass Map tab showed "No passing data for this match yet" for Sweden v Tunisia, while every other tab (Overview, Heatmap, Shots…) rendered fine for the same game.
**Root cause:** Pass Map was the *only* tab that re-derived team stats from the pre-baked static `MATCH_STATS`/`PLAYER_MATCH_STATS` by `fixtureId` (`passStructure(match.fixtureId, team)`), instead of using the live `match` object the screen already holds. A matchday-1 game still in progress isn't baked into `matchStatsData.ts` yet — it only exists as a live overlay from `/api/match-stats` (web) — so the static lookup missed and `passStructure` returned `null`.
**Fix:** Added an optional `liveStats?: TeamMatchStats` fallback to `passStructure` (`teamMatchStats(...) ?? liveStats ?? null`); `PassMapModule` now passes `side === 'home' ? match.homeStats : match.awayStats`. Team-level cards now render from the live feed. Per-player nodes still come only from `PLAYER_MATCH_STATS` (no per-player live feed — stay honest), so the pitch shows a note ("Per-player passing map appears once the match is finalised") instead of a blank screen.
**Lesson:** When a component is handed a live `match`/data object, use it directly — don't re-look-up the same entity from static files by id, or you go blank for anything not yet synced. Check whether sibling tabs/components already do it the right way.

### 2026-06-15 — Heatmap 7-tab bar overflowed off-screen on mobile
**Symptom:** On a phone, only the first ~4.5 heatmap tabs (Overview…part of Shots) were reachable; Pass Map and Players were cut off with no way to reach them.
**Root cause:** The tab bar was a fixed `<View flexDirection:'row'>` — fine on a wide laptop, but it overflowed the narrow viewport with no scroll.
**Fix:** Converted it to a horizontal `ScrollView` (the *exact* pattern the match picker right above it already uses: `horizontal showsHorizontalScrollIndicator={false}`, `flexGrow:0`, bottom border moved to the scroll-container style so the divider still spans full width).
**Lesson:** For a row of chips/tabs that can outgrow the screen, copy the existing horizontal-`ScrollView` picker pattern in the same file rather than inventing layout — consistency + already-proven on mobile.

### 2026-06-15 — Sync bots fail silently on a git push race → data goes stale (THE recurring root cause)
**Symptom:** `Sync Live Match Stats — Failed in 32s` in CI, and live/finished matches missing their heatmap (e.g. Spain v Cape Verde, Belgium v Egypt) even after kickoff.
**Root cause:** Every `sync-*.yml` workflow ends in a bare `git push` to `main`. Four bots run on a `*/5` cron during match windows; when two land in the same minute the second push is rejected (non-fast-forward) and the run dies after ~32s — all work done, only the push lost. The committed data is left stale; the heatmap is gated on `MATCH_STATS` membership, so a match that kicked off after the last successful run has no heatmap. The scripts themselves are fine (defensive); the failure is the unguarded push + nobody watching.
**Fix (recon #14 `67f609e`):** (1) `scripts/git-push-retry.sh` — on rejection, `git pull --rebase --autostash origin main` and retry ×5 (conflict-free, each bot writes a different file); wired into all 7 committing workflows. (2) `scripts/check-data-health.ts` + `.github/workflows/data-health.yml` — a watchdog cron (every 10 min) that compares `WC_FIXTURES` vs committed feeds ("right data at the right time": live→fresh stats, finished→heatmap+result, pre-KO→lineup), **auto-heals** (re-runs the stale bot + retry-push) then **fails loudly** if a critical issue survives (GitHub emails the owner — no SMTP). 8D report in `action/8D_REPORT_2026-06-15_data-staleness.md`.
**Lesson:** On a shared branch under concurrency, a rejected push is *expected and retryable*, never fatal. And a data pipeline with no freshness monitor is always debugged reactively through its symptoms — add the watchdog. NOTE: `scripts/recon-ship.mjs` (`npm run ship`) still bare-pushes, so manual ships still lose the race — recover with `bash scripts/git-push-retry.sh`. Two actors regenerating the *same* generated file (manual heal + CI bot) cause a true content conflict the retry script correctly won't auto-merge → reset to `origin/main`, regenerate, reship. Prefer letting the CI watchdog heal (server-side, no self-race) over manual local heals.

### 2026-06-15 — sync-fixture-results blanked curated data on fetch failure (latent data-wipe)
**Symptom:** A local run printed "Writing empty results file" and wiped every recorded result in `lib/fixtureResultsData.ts` (health check jumped from 1→5 warnings). It also couldn't run locally at all.
**Root cause:** Three inconsistencies vs the known-good `sync-live-stats.ts`: it read only `API_FOOTBALL_KEY` (no `?? API_KEY` fallback), loaded only `.env.local` (not `.env`, where the key lives), and — critically — on fetch failure it `console.warn`ed but did **not** `return`, falling through to write an empty map. In CI a transient secret hiccup would have erased all results.
**Fix (recon #15 `1333fc3`):** added `?? process.env.API_KEY`, added the `.env` dotenv load, and made it `return` (leave file untouched) on fetch failure AND when the result map is empty — matching `sync-live-stats`'s defensive pattern. Restored the file from git first (`git checkout -- lib/fixtureResultsData.ts`; the bad write was never committed).
**Lesson:** A sync bot must NEVER overwrite curated data with empty/partial output — leave the committed file untouched on any failure. When adding a new sync script, copy the env-loading + defensive-return pattern from `sync-live-stats.ts` verbatim. Open audit: same check still owed on `sync-standings`/`sync-match-events`/`sync-squads`/`sync-lineups`/`sync-injuries`.

### 2026-06-15 — Players tab empty before kickoff (no honest early names)
**Symptom:** The 👤 Players tab showed "No standout yet" for upcoming matches (e.g. Spain v Cape Verde) — no player names until ~40 min before kickoff.
**Root cause:** Per-match names come from `startingXI()` ← `MATCH_LINEUPS`, but baseline lineups are formation-only (`players: []`); api-football posts the real XI only ~40 min pre-KO. No early names existed.
**Fix (recon #12 `164238f`):** added `matchSquads(fixtureId)` to `lib/playerImpact.ts` (real committed squads from `playerProfilesData`, keyed by `nation`, ranked by caps — names+club+caps) and a 📋 SQUADS card in `PlayersModule` shown only when there's no confirmed XI, labeled "starting XI confirms ~40 min before kickoff". Auto-upgrades to the confirmed XI when posted.
**Lesson:** To show data "early" without breaking the no-fabrication rule, fall back to the real squad *pool* (honest, labeled as not-the-XI) — never a guessed/predicted starting XI (we have no positions in profiles anyway). `playerProfilesData` is keyed by `nation` (not `team`) and has no position field.

### 2026-06-16 — "Use 130k API calls/day" → the real lever was freshness architecture, not quota
**Symptom:** Only ~1,338 of 150,000 daily api-football calls used; request to "push to 130k/day, no lag, use as much data as possible."
**Root cause:** Quota was never the constraint. Two gentle pipelines: (1) git sync bots capped by **GitHub Actions cron's 5-min floor** (can't beat it, and it runs late under load); (2) runtime `/api/*` polling that was **web-only** — every live hook (`useLiveStats/useLiveResults/useLineups/useTournamentIntelligence`) early-returned on `Platform.OS !== 'web'`, so **native (iOS/Android) had zero live polling** and only ever saw git-synced data. A shared Vercel `s-maxage` edge cache also dedups all clients, so upstream calls scale with **miss-rate × edge-regions × live-fixtures, NOT user count** — more traffic barely moves quota.
**Fix:** A 5-point program (recon #17–#21). #2 (`#18`) added `lib/apiBase.ts` — `apiUrl()` returns a relative path on web (byte-identical, edge-cached) and an absolute prod origin on native (`EXPO_PUBLIC_API_ORIGIN`, default `https://worldcupilou2.vercel.app`); lifted the `Platform.OS` guards. #3 (`#19`) tightened `s-maxage` 30→15s + client polls to match. The honest message back to the user: chasing a call-count number is the wrong KPI — the win is fresher/richer *displayed* data; quota follows.
**Lesson:** When asked to "use more API," first find the *binding* constraint — it's usually architectural (a cron floor, a missing runtime path, a `Platform.OS`-gated hook), not the quota ceiling. A shared edge/CDN cache means call volume scales with cache-miss-rate, not users — so "more users" or "faster polling within the TTL" won't multiply quota; only shorter TTL, more endpoints, or more live fixtures will. Native `fetch('/api/..')` needs an **absolute** URL (no page origin on RN); centralize it in one helper.

### 2026-06-16 — A sync script wired to no workflow is invisibly dead (player-stats a day stale)
**Symptom:** `lib/playerStatsData.ts` (feeds Pass Map per-player nodes, Shots GK saves, Players-tab impact — 3 honest models) was a day stale; `scripts/sync-player-stats.ts` existed and was defensive/correct but never refreshed in CI.
**Root cause:** The script was fully written but **wired to no `.github/workflows/*.yml`**, so it had never run server-side. CLAUDE.md even claimed "no per-player live feed — stay honest," but `/fixtures/players` *does* give real per-player aggregates; the script just wasn't scheduled.
**Fix (recon #17 `c1b30b6`):** added `.github/workflows/sync-player-stats.yml` mirroring `sync-live-stats.yml` (`*/5` live cadence, `git-push-retry`); validated against the live feed (14 fixtures, 435 rows) and refreshed the file 313→435 rows.
**Lesson:** When auditing data freshness, don't just read the sync *script* — confirm a *workflow actually runs it*. A correct, defensive script with no scheduler is a silent staleness source. `/fixtures/players` gives honest per-player aggregates (not who→whom pass links — those we still never fabricate).

### 2026-06-16 — Lili vs The Market (odds + predictions); api-football's 33/33/33 "no model" sentinel
**Symptom:** Building a 3-way "Lili vs Market vs Model" comparison; api-football `/predictions` returned `percent {33%,33%,33%}` + `advice: "No predictions available"` for most WC fixtures.
**Root cause:** 33/33/33 is api-football's **degenerate no-data sentinel**, not a real prediction — surfacing it would be fabrication.
**Fix (recon #20 `7661acb`, #21 `23641c2`):** `scripts/sync-market-odds.ts` fetches `/odds` (14 bookmakers, **de-vigged**: `1/odd` normalised so home+draw+away=1 removes the overround) + `/predictions`; treats the sentinel as `model: null` (also nulls all-equal percents). `lib/marketComparison.ts` joins Lili (`wcSimulation.matchProbs` from team strengths) + market + model with an agree/differ verdict; new `app/lili-vs-market.tsx` (reached via a pill on `worldcup-table`, route in `_layout`, per-domain `lib/marketI18n.ts` all 11 langs, `*/30` workflow). #5 widened the bot to **all 72 fixtures incl. finished closing lines** (odds freeze at kickoff) and added `lib/trackRecord.ts` — scores each source's pre-match favourite vs actual result (Lili 6/14, Market 6/14, Model 1/5; draws honestly count against all).
**Lesson:** Always probe a new endpoint's "no data" shape before trusting it — providers return degenerate-but-non-null placeholders (33/33/33 + a tell-tale advice string). Convert odds→probabilities by de-vigging (normalise `1/odd`). A finished fixture's `/odds` is the **closing line** — valid for back-testing. And **audit coverage before backfilling**: all 72 current fixtures were already fully covered, so "wider coverage" pivoted from redundant busywork to the track-record feature.

### 2026-06-18 — Group standings lagged broadcasters (baked file vs live overlay)
**Symptom:** Live scores updated on web, but the Group A table stayed hours behind BBC.
**Root cause:** `app/worldcup-table.tsx` did `GROUP_STANDINGS.some(s => s.played>0) ? getApiStandings() : computeStandings(group, liveResults)` — so the instant the baked `standingsData.ts` had any played game (i.e. since kickoff) it **permanently** used the static baked file, which is refreshed only every ~4h by a git bot AND gated behind a Vercel redeploy. The fresh `liveResults` (already polled via `/api/fixture-results`) were ignored.
**Fix (`96a0af4`):** prefer `computeStandings(group, liveResults)` (rides the ~15-20s runtime overlay); keep baked only as a defensive fallback when it reflects MORE played games. No git commit / redeploy in the freshness loop.
**Lesson:** When a screen looks stale vs broadcasters, check whether it reads a **baked `lib/*Data.ts`** (deploy-gated) or the **runtime `/api/*` overlay**. Derive secondary views (standings, form) from the live results the app already holds — don't re-read the deploy-gated baked file. Most data-bot commits carry `[skip ci]`, so they don't even redeploy — only the runtime overlay is truly live.

### 2026-06-18 — Czechia score stuck at 1-0 (endpoint TEAM_NAME_MAP drift)
**Symptom:** "Czechia 1-1 South Africa" (FT) displayed as a stale 1-0.
**Root cause:** `api/fixture-results.ts` was the ONE file whose `TEAM_NAME_MAP` lacked `'Czechia' → 'Czech Republic'` (every `scripts/sync-*.ts` + other `/api` routes already had it). The live overlay came back keyed `Czechia|South Africa`, never matched the app's `Czech Republic|South Africa` fixture key, so the baked snapshot stuck.
**Fix (`843d567`):** copied the canonical map from `sync-fixture-results.ts` into the endpoint (also fixed Curaçao/Türkiye/Bosnia/Cape Verde). Canonical app name is **"Czech Republic"**; api-football says "Czechia". Verified live: prod endpoint now returns the mapped key + 1-1.
**Lesson:** When ONE match/team is stuck or blank while siblings work, suspect a **name-mapping mismatch** first (same class as the 2026-06-13 abbreviated-name bug). The runtime `/api/*` maps must stay identical to `sync-fixture-results.ts` — a missing entry silently breaks the live overlay for that team only.

### 2026-06-18 — `[skip ci]` bot commits buried real code deploys on Vercel
**Symptom:** A shipped code fix (the standings fix) didn't go live; Vercel showed a bot's `chore: refresh injury data [skip ci]` as the current commit.
**Root cause:** Data bots commit every few minutes with `[skip ci]` (correct — live data is runtime-served, no rebuild needed). But a `[skip ci]` commit landing on top of a code change made Vercel skip the build for that push too, so the code change never deployed (happened twice).
**Fix:** `scripts/vercel-should-build.sh` — a Vercel **Ignored Build Step** that decides by WHAT CHANGED: any non-`lib/*Data.ts` change always deploys; data-only commits skip; fail-safe builds on ambiguity. **Activation is manual & one-time:** Vercel → Project → Settings → Git → Ignored Build Step → `bash scripts/vercel-should-build.sh`. Stop-gap to force a deploy now: push an empty non-`[skip ci]` commit.
**Lesson:** `[skip ci]` controls deploys by *commit message*, which races badly with high-frequency bots. Gate deploys by *changed files* instead. Retired the injuries bot (`ee2c905`) + its dead UI (`074305f`) as part of this — api-football has no WC injury feed, so it fetched 0 records and only emitted timestamp-only `[skip ci]` noise (~6/day): pure downside.

### 2026-06-18 — Hardened sync-standings/injuries env loading (latent local no-op)
**Symptom:** `sync-standings.ts` aborted locally ("API_FOOTBALL_KEY not set") even with the key in `.env`.
**Root cause:** Like the recon #15 fixture-results bug, these two read only `API_FOOTBALL_KEY` and loaded only `.env.local` (key lives in `.env` as `API_KEY`). They defensively no-op'd rather than wiping data — but never updated locally.
**Fix (`375cce0`):** added the `.env` load + `?? process.env.API_KEY` fallback, matching `sync-live-stats.ts`. Closes the open audit item from recon #15.
**Lesson:** Every new/edited sync script must copy the env-loading + key-fallback block from `sync-fixture-results.ts` verbatim. Audit remaining: `sync-match-events`/`sync-lineups`/`sync-player-stats`/`sync-market-odds` already correct; `sync-standings`/`sync-injuries` now fixed.

### 2026-06-18 — Misdiagnosed "bots frozen" off a stale local clone (process)
**Symptom:** Concluded the sync bots were dead/frozen for 3 days based on local `git log`.
**Root cause:** The local Google-Drive clone hadn't been `git pull`ed since the prior session; `origin/main` had bot commits from minutes ago. The push then hit a real merge conflict (two actors regenerating the same generated file), correctly refused by `git-push-retry.sh`.
**Fix:** `git fetch` first; reset local to `origin/main`; re-applied only the genuine code changes (never the regenerated data files — let the bots own those).
**Lesson:** Before concluding a remote pipeline is broken, **`git fetch` and check `origin/main`** — a stale local clone is a misdiagnosis trap. And per the existing rule: two actors regenerating the *same* generated file is a real conflict → reset + keep only your code changes, don't auto-merge.

### 2026-06-20 — `recon-ship` improved (push-retry + verify); then a post-rebase-HEAD false-abort bug
**Symptom:** A ship's commit succeeded but `git push` failed (sync bot won the race); manual `git rebase origin/main && git push` was needed. After wiring `git-push-retry.sh` in, the verify step then false-aborted ("Local and GitHub HEAD differ") even though the push had succeeded.
**Root cause:** (1) `recon-ship.mjs` bare-`git push`ed — no retry. (2) After adding retry, the script captured `localHead` *before* the push; `git-push-retry.sh` rebases on a lost race, which **rewrites the local commit SHA**, so the pre-push SHA no longer matched GitHub.
**Fix:** `recon-ship.mjs` now pushes via `bash scripts/git-push-retry.sh` (fetch→rebase→retry ×5, never force), recovers a committed-but-unpushed HEAD on a clean tree, and **re-reads `git rev-parse HEAD` AFTER the push** before comparing to `git ls-remote`. Added a best-effort Vercel check (`vercel ls --meta githubCommitSha` for the URL → `vercel inspect` for status — status table is on STDERR; ls's table is TTY-only). `SHIP_SKIP_VERCEL=1` skips it. See memory `project_ship_workflow`.
**Lesson:** Any "did my push land?" check must read HEAD *after* a push that may rebase — the SHA is not stable across `git-push-retry`. The race itself is normal: it happened on nearly every ship this session and retry handled it.

### 2026-06-20 — Standings rendered each team twice (G–L) — duplicate rows in generated data
**Symptom:** Groups G–L showed every team twice (e.g. Group G: NZ, NZ, Iran, Iran…); A–F were fine; the dupes "started after" the qualification-line separator.
**Root cause:** NOT the renderer (single `entries.map`) and NOT combining sources. `lib/standingsData.ts` itself held duplicate rows — `sync-standings.ts buildEntries` flattened api-football's `ApiStandingEntry[][]` response **without de-duping**, and that response repeats some group sub-arrays (13 sub-arrays → 97 rows → 60 unique on 2026-06-20). The dup rows also **inflated `played(baked)`**, which made `worldcup-table.tsx`'s source selector wrongly prefer the polluted baked data over the clean `computeStandings(live)`.
**Fix:** de-dupe by `(group,team)` in `buildEntries` (generator, durable root-cause fix), a defensive de-dupe by team in `getApiStandings` (UI can never double-render + un-inflates the selector), and a one-off in-place clean of the committed file (97→60, no value changes). Verified live dry-run: 97→60.
**Lesson:** When a UI shows duplicates, check the **generated data file** before the render path — and api-football's `/standings` returns repeated/overlapping sub-arrays, so codegen that flattens it MUST de-dupe by `(group,team)`. A count-based "which source is fresher?" selector is fooled by duplicate rows; de-dupe before counting.

### 2026-06-20 — Premium Match-Analytics dashboard: needed SVG (react-native-svg added)
**Symptom:** Tasked to reproduce a premium match-centre reference (smooth momentum wave, crisp pitch/arcs, shot dots, pass nodes). The View-only toolkit (CSS-blur heatmap, View pitch markings) couldn't hit "visual parity."
**Root cause:** No vector primitives — smooth filled curves, true gradients, penalty arcs and precise dots are not feasible with RN `<View>`s; `react-native-svg` was not installed.
**Fix:** Added `react-native-svg@15.12.1` via `npx expo install` (web bundles fine — validated `npm run build`; **native needs an EAS rebuild** to pick it up). Built shared `components/PitchSvg.tsx` (100×64 viewBox, markings ABOVE overlay children), `components/MomentumWave.tsx` (Catmull-Rom→Bézier area, blue-above/red-below, leader-lines + dots), `components/TerritoryPitch.tsx` (smooth SVG territory gradient), and panels in `components/MatchDashboard.tsx`. See memory `project_analytics_dashboard`.
**Lesson:** For premium data-viz in this RN/Expo app, `react-native-svg` is the right tool (true gradients/curves/arcs) — but it's a **native dep**: web/Vercel gets it immediately, iOS/Android only after an EAS rebuild. Honesty held: shot dots placed by *area* (no coords), pass *nodes* by role (no who→whom links), territory/zones laterally symmetric (no L/R tracking).

### 2026-06-20 — Heatmap desktop wasted space: it was the only page capping width
**Symptom:** On laptop the Heatmap floated in a centred narrow box with big black side margins, tiny rail/momentum, while Overview / Attack Zones / Home Edge felt full and premium.
**Root cause:** Heatmap was the *only* page using `maxWidth` + `alignSelf:'center'` (+ a capped `pitchCap`). Every sibling module uses one shared grid: `wrap{padding:14}` (full width, **no maxWidth**) → `cols{row}` → `left{flex ~1.3}` + `right{width 320–330}` → stacked cards. Earlier I'd also briefly locked it to fixed `height` (100vh) which trapped momentum below the fold.
**Fix:** progression — first made it phone-first scrollable (removed the 100vh/nested-rail trap), then adopted the **shared edge-to-edge two-column grid** verbatim (`heatLeft flex 1.3` + `heatRight width 330`, full width, page scrolls). Phone layout untouched throughout (it was the source of truth).
**Lesson:** When one page "feels off" vs the rest, **compare layout systems before tuning numbers** — match the shared grid the working pages already use rather than inventing per-page widths. Never lock a content page to a fixed `height`/100vh that can hide content; let the page scroll. Aspect-locked pitch can't be "wider but not taller" — widening = proportionally taller; resolve by matching siblings + scroll, not by capping.

## Match Hub — Tab Architecture (`app/match-heatmap.tsx`)
The screen (route still `/match-heatmap`, header now reads **"MATCH INTELLIGENCE"**) is the in-app match-intelligence hub. Its `TABS` array is **one tournament-level tab plus six match-intelligence tabs**, each rendered by its own explicit branch in `MatchHeatmapScreen` and backed by an honest model in `lib/`. The standalone **Heatmap tab and its pre-kickoff forecast pitch were retired in recon #46** (`TerritoryPitch.tsx` + `lib/heatmapForecast.ts` are now orphaned). Momentum lives only inside Overview now.

**PRODUCT RULE (architecture invariant — preserve it):**
> **Dashboard = tournament-level intelligence.** **Overview / Home Edge / Attack Zones / Shots / Pass Map / Players = focused match intelligence or signal views.** Never put match-level widgets in Dashboard, and never push tournament-level rollups into the match tabs.

**📈 Dashboard** — the **tournament-level command centre** (no match picker, no match-level widgets) → `components/DashboardModule.tsx`. Dashboard v1 (recon #49): **🏆 World Cup Leaders** (player top scorers / assists / defensive / goalkeepers, from `lib/playerImpact` — moved here from the Players tab), **🌍 Team Rankings** (from `lib/shotsModel` `shotRankings`), and **🌟 Lili XI · Team of the Tournament Watch** (`components/LiliXI.tsx` ← `lib/dashboardModel.ts` `buildLiliXI`) — an evolving, explicitly **non-official** best XI + a "Lili Formation" label chosen by where impact is concentrated (4-3-3 / 4-2-3-1 / 5-3-2). Roles come from real per-match positions (GK/DF/MF/FW in `playerStatsData`); a slot with no honest candidate stays "data pending" — no fabricated names/positions/formations. `DashboardModule` accepts an optional `favTeam` to softly highlight the followed team — **TODO: no global favourite-team store yet** (journey screen keeps it in local state). Still to come: Home Edge Tracker, Attack / Defence / Passing rankings, Lili Spotlight. The Players tab keeps a small card pointing here.

**Match-intelligence tabs** (each its own component + `lib/` model):
1. **📊 Overview** — `OverviewModule` (+ `TournamentImpactPanel`) ← `lib/matchOverview.ts` · the cinematic "opening scene": hero score block + verdict badge + Lili headline, Match & Stadium Intelligence (capacity / June-avg temp / altitude — real curated `stadiumData` fields), Key Statistics, the smooth `MomentumPanel` heartbeat, Lili analysis, Control Index duel, Match Drivers, Tournament Impact. Single full-width column (order: Stats → Momentum → Lili → Control → Drivers).
2. **🏟 Home Edge** — `HomeEdgeModule` ← `lib/homeEdge.ts` · **tournament-wide** (no picker/pitch): does being the home side confer an edge this tournament? Impact % mirrors the sim's win-prob change.
3. **⚔️ Attack Zones** — `AttackZonesPanel` (SVG) + `AttackZonesModule` ← `lib/attackZones.ts` · "where does this team create danger?": only bands we truly have — inside box, from distance, wide/corners. No invented left/right split.
4. **🎯 Shots** — `ShotsMapPanel` (SVG) + `ShotsModule` ← `lib/shotsModel.ts` · shot splits, conversion, xG, Danger Index, finishing efficiency, GK saves vs xGA. Plotted by **area**, never fake coordinates.
5. **🕸 Pass Map** — `PassMapPanel` (SVG) + `PassMapModule` ← `lib/passStructure.ts` · real per-player passes/accuracy + possession, laid out by formation role. **No fabricated who→whom links.** Connectivity Score, Team Style.
6. **👤 Players** — `PlayersModule` ← `lib/playerImpact.ts` · **tournament-wide** (uses selected match for hero/contributors): goals, assists, saves, ratings, clean sheets.

The SVG panels (`AttackZonesPanel` / `ShotsMapPanel` / `PassMapPanel` / `MomentumPanel`) live in `components/MatchDashboard.tsx` and render **inside their own per-match tabs** — never in the Dashboard tab. (`MomentumPanel` is now used only by Overview; `KeyStatsPanel` was removed in recon #40.) NOTE: the timeline entry button is still labelled "🔥 Heatmap →" (`tlHeatmap` i18n key) — a rename is owed since the Heatmap tab is gone.

**Unifying principle (the whole point of these tabs):** every panel is an honest *model* from real api-football aggregates / committed data — we have NO player tracking or shot/pass coordinates, so we never fabricate positions, pixel-exact locations, or pass-pair lines. Each `lib/` model's header comment states exactly what real signal it's allowed to use. Preserve this when extending any tab.

## What's Working (Don't Touch)
- Pre-built squad profiles (all 48 teams) so live scoring needs no lookup.
- Scoring engine (`lib/scoring.ts`) and the generated WC data pipeline.

## Architecture Decisions
- Pre-bake data into committed `.ts` files instead of fetching at runtime → instant, offline-capable app + no API rate-limit exposure on device.
- Quality bar: every new scorer needs a full profile + precise minutes in the **same commit** (see memory `feedback_scorer_quality_standard.md`). No exceptions.
- On any data misalignment, WebSearch the real schedule/draw as the tiebreaker, then fix the wrong local file (memory `feedback_verify_data_against_internet.md`).

## Dependencies & Environment
- Runtime: Node + npm (no Python). TypeScript ~5.3 (strict mode), run scripts via `tsx`.
- Expo SDK ~54 · Expo Router ~6 (file-based routing, typed routes) · React Native 0.81.5 · React 19.1
- Key libs: `@react-navigation/drawer`, `@upstash/redis`, `react-native-reanimated`, `react-native-webview`, `react-native-gesture-handler`; dev: `googleapis`, `dotenv`, `tsx`
- Env: copy keys into `.env` — needs both `API_KEY` and `EXPO_PUBLIC_API_KEY` (Expo only exposes `EXPO_PUBLIC_`-prefixed vars to the client). Private session notes go in `CLAUDE.local.md` (gitignored).
