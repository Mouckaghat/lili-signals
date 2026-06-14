#!/usr/bin/env node
/**
 * scripts/recon-ship.mjs
 *
 * One-shot "ship an improvement" helper for the recon workflow.
 *   1. Reads/increments a persistent counter (.recon-count) → recon number.
 *   2. Stages everything, commits as `recon #N: <message>`, pushes to origin.
 *
 * Usage:
 *   node scripts/recon-ship.mjs "fixed lineups bot + refreshed matchday-1 data"
 *   npm run ship -- "your message"
 *
 * The counter file is committed alongside the change, so the number is stable
 * across machines and survives clones.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COUNT_PATH = path.join(ROOT, '.recon-count');

const msg = process.argv.slice(2).join(' ').trim();
if (!msg) {
  console.error('✗  Provide a message:  node scripts/recon-ship.mjs "what changed"');
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'pipe' }).toString().trim();

// Nothing to ship? Bail before bumping the counter.
if (!run('git status --porcelain')) {
  console.log('✓  Working tree clean — nothing to ship.');
  process.exit(0);
}

const prev = fs.existsSync(COUNT_PATH)
  ? Number.parseInt(fs.readFileSync(COUNT_PATH, 'utf8').trim() || '0', 10) || 0
  : 0;
const next = prev + 1;
fs.writeFileSync(COUNT_PATH, `${next}\n`);

const commitMsg = `recon #${next}: ${msg}\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`;

run('git add -A');
execSync(`git commit -F -`, { cwd: ROOT, input: commitMsg, stdio: ['pipe', 'inherit', 'inherit'] });
console.log(`\n→  Pushing recon #${next}…`);
execSync('git push', { cwd: ROOT, stdio: 'inherit' });
console.log(`\n✓  Shipped recon #${next}: ${msg}`);
