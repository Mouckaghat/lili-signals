#!/usr/bin/env node
/**
 * scripts/recon-ship.mjs
 *
 * One-command "ship an improvement" helper for the recon workflow.
 *   1. Reads/increments a persistent counter (.recon-count) → recon number.
 *   2. Stages everything, commits as `recon #N: <message>`.
 *   3. Pushes to origin/main via scripts/git-push-retry.sh — on a non-fast-forward
 *      rejection it fetches + rebases onto the latest origin/main and retries
 *      (5 attempts, NEVER a force-push, never rewrites remote history).
 *   4. Verifies the deployment: local HEAD == GitHub HEAD, then confirms Vercel
 *      built a production deployment from this exact commit.
 *
 * Usage:
 *   node scripts/recon-ship.mjs "fixed lineups bot + refreshed matchday-1 data"
 *   npm run ship -- "your message"
 *
 * Env knobs:
 *   SHIP_SKIP_VERCEL=1   skip the Vercel verification step (push + GitHub check only)
 *
 * The counter file is committed alongside the change, so the number is stable
 * across machines and survives clones.
 *
 * Why git-push-retry.sh instead of a bare `git push`: several sync bots commit to
 * `main` every few minutes, so a manual ship routinely loses the push race
 * (non-fast-forward). The bare push used to fail and require a manual
 * `git rebase origin/main && git push`. This makes `npm run ship` self-recovering.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COUNT_PATH = path.join(ROOT, '.recon-count');
const PUSH_RETRY = path.join(ROOT, 'scripts', 'git-push-retry.sh');
const VERCEL_PROJECT = 'worldcupilou2';
const PROD_URL = 'https://worldcupilou2.vercel.app';

const msg = process.argv.slice(2).join(' ').trim();
if (!msg) {
  console.error('✗  Provide a message:  node scripts/recon-ship.mjs "what changed"');
  process.exit(1);
}

/** Run a command, capture trimmed stdout. Throws on non-zero exit. */
const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'pipe' }).toString().trim();
/** Run a command, capture stdout but never throw (returns '' on failure). */
const runSoft = (cmd) => {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: 'pipe' }).toString().trim();
  } catch (e) {
    return (e.stdout?.toString() ?? '').trim();
  }
};
const short = (sha) => (sha || '').slice(0, 7);

// ── 1. Decide what we're shipping ──────────────────────────────────────────
const dirty = !!run('git status --porcelain');
// Is the local branch ahead of its upstream? (commits made but never pushed —
// e.g. a previous ship whose commit succeeded but whose push failed.)
const aheadCount = Number.parseInt(
  runSoft('git rev-list --count @{upstream}..HEAD') || '0',
  10,
);

if (!dirty && aheadCount === 0) {
  console.log('✓  Working tree clean and nothing un-pushed — nothing to ship.');
  process.exit(0);
}

if (!dirty && aheadCount > 0) {
  console.log(
    `↻  Working tree clean, but ${aheadCount} local commit(s) not on origin — recovering the push.`,
  );
}

// ── 2. Commit (only if there are staged/unstaged changes) ──────────────────
let shippedRecon = null;
if (dirty) {
  const prev = fs.existsSync(COUNT_PATH)
    ? Number.parseInt(fs.readFileSync(COUNT_PATH, 'utf8').trim() || '0', 10) || 0
    : 0;
  const next = prev + 1;
  fs.writeFileSync(COUNT_PATH, `${next}\n`);
  shippedRecon = next;

  const commitMsg = `recon #${next}: ${msg}\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`;
  run('git add -A');
  execSync('git commit -F -', {
    cwd: ROOT,
    input: commitMsg,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
}

const localHead = run('git rev-parse HEAD');

// ── 3. Push with automatic fetch → rebase → retry (never force) ────────────
console.log(`\n→  Pushing${shippedRecon ? ` recon #${shippedRecon}` : ''} (${short(localHead)}) via git-push-retry.sh…`);
try {
  execSync(`bash "${PUSH_RETRY}"`, { cwd: ROOT, stdio: 'inherit' });
} catch {
  console.error(
    '\n✗  Push failed after all retries. Remote history was NOT rewritten.\n' +
      '   Inspect with:  git fetch origin && git log --oneline origin/main..HEAD\n' +
      '   Then re-run:    npm run ship -- "' + msg + '"',
  );
  process.exit(1);
}

// ── 4. Verify GitHub HEAD == local HEAD ────────────────────────────────────
// Re-read HEAD *after* the push: git-push-retry.sh rebases on a rejected push
// (lost the race with a sync bot), which rewrites our commit's SHA. Comparing
// the pre-push SHA would be a false mismatch even though the push succeeded.
console.log('\n── Deployment verification ───────────────────────────────────');
const pushedHead = run('git rev-parse HEAD');
const remoteLine = runSoft('git ls-remote origin -h refs/heads/main');
const remoteHead = remoteLine.split(/\s+/)[0] || '';
const githubMatch = remoteHead && remoteHead === pushedHead;

console.log(`${githubMatch ? '✅' : '❌'}  Local HEAD:  ${short(pushedHead)}`);
console.log(`${githubMatch ? '✅' : '❌'}  GitHub HEAD: ${short(remoteHead) || '(unknown)'}`);
if (!githubMatch) {
  console.error(
    '\n✗  Local and GitHub HEAD differ — the push did not land cleanly. Aborting before deploy check.',
  );
  process.exit(1);
}

// ── 5. Verify Vercel production deployment for THIS commit ─────────────────
if (process.env.SHIP_SKIP_VERCEL) {
  console.log('\nℹ️  SHIP_SKIP_VERCEL set — skipping Vercel verification.');
} else {
  verifyVercel(pushedHead);
}

console.log(
  `\n✅  Shipped${shippedRecon ? ` recon #${shippedRecon}` : ''}: ${msg}`,
);

/**
 * Best-effort Vercel check. Polls `vercel ls --meta githubCommitSha=<sha>` until a
 * deployment built from our exact commit shows up, then reads its status via
 * `vercel inspect` and reports URL + status + commit.
 * Never fails the ship: a data-only commit can be intentionally skipped by the
 * Ignored-Build-Step guardrail (scripts/vercel-should-build.sh), in which case no
 * deployment is created for this SHA — that's reported, not treated as an error.
 *
 * CLI quirks handled here:
 *   • `vercel ls` prints the status TABLE only on a TTY; piped, it emits just the
 *     deployment URL(s) on stdout — so we take the URL from `ls`…
 *   • …then get the status from `vercel inspect`, which writes its detail table to
 *     STDERR (hence the `2>&1` capture and `runVercelInspect`).
 */
function verifyVercel(headSha) {
  const ATTEMPTS = 6;
  const WAIT_S = 5;
  console.log('\n→  Checking Vercel production deployment…');

  // Auth check by exit code — whoami exits non-zero when not logged in.
  let authed = false;
  try {
    execSync('npx --yes vercel whoami', { cwd: ROOT, stdio: 'pipe' });
    authed = true;
  } catch {
    authed = false;
  }
  if (!authed) {
    console.log(
      'ℹ️  Vercel CLI not authenticated here — skipping deploy check.\n' +
        `   Production URL: ${PROD_URL}  (deploy is triggered by the push above)`,
    );
    return;
  }

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const ls = runSoft(
      `npx --yes vercel ls ${VERCEL_PROJECT} --meta githubCommitSha=${headSha} 2>/dev/null`,
    );
    const deployUrl = (ls.match(/https:\/\/\S+\.vercel\.app/g) || []).pop();

    if (deployUrl) {
      // Status lives on stderr of `inspect` → capture combined output.
      const insp = runSoft(`npx --yes vercel inspect ${deployUrl} 2>&1`);
      const status = (insp.match(/status\s+●?\s*([A-Za-z]+)/i) || [])[1] || 'Unknown';
      const done = status === 'Ready';
      const failed = status === 'Error' || status === 'Canceled';
      const icon = done ? '✅' : failed ? '❌' : '🔄';
      console.log(`${icon}  Vercel status:   ${status}`);
      console.log(`${icon}  Commit deployed: ${short(headSha)}`);
      console.log(`${icon}  Deployment URL:  ${deployUrl}`);
      console.log(`✅  Production URL:  ${PROD_URL}`);
      if (!done && !failed) {
        console.log('   (build in progress — it will alias to the Production URL when Ready.)');
      }
      return;
    }

    if (attempt < ATTEMPTS) {
      execSync(`sleep ${WAIT_S}`, { stdio: 'ignore' });
    }
  }

  // No deployment for this SHA after polling → most likely an intentional skip.
  console.log(
    `ℹ️  No production build registered for ${short(headSha)} after ${ATTEMPTS * WAIT_S}s.\n` +
      '   This is expected for data-only commits (Vercel Ignored-Build-Step skips them).\n' +
      `   Production URL: ${PROD_URL}`,
  );
}
