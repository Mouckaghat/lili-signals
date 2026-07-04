// Shared writer for the sync bots' generated lib/*Data.ts files.
//
// WHY THIS EXISTS: every sync script stamps a fresh `updatedAt` on each record and
// a file-level `*_LAST_UPDATED` on every run. Those change even when the actual
// data is byte-for-byte identical, so the file always looked "changed" → the
// workflow's `git diff --cached --quiet || git commit` always committed → a
// 100+-line no-op churn commit every ~15 min, per bot, forever. That buries the
// commits where data GENUINELY changed and inflates history for zero information.
//
// FIX: compare the new content to what's on disk with ONLY the two generated
// timestamp fields normalized out (never any real data field). If nothing material
// changed, leave the committed file exactly as-is → git sees no diff → no commit.
// When data really does change, the timestamps ride along as before.

import fs from 'node:fs';

// Normalize the two auto-generated timestamp fields to a constant so a
// timestamp-only delta compares equal. Targeted on purpose — we do NOT strip
// every ISO/`Z` value, so real `date:` fields (fixtures, etc.) are untouched.
function normalize(src: string): string {
  return src
    // per-record  "updatedAt": "2026-…Z"
    .replace(/("updatedAt"\s*:\s*)"[^"]*"/g, '$1"<ts>"')
    // file-level  XXX_LAST_UPDATED = '2026-…Z'
    .replace(/(_LAST_UPDATED\s*=\s*)['"][^'"]*['"]/g, "$1'<ts>'");
}

/**
 * Write `content` to `path` only if it differs from the existing file once the
 * generated refresh timestamps are ignored. Returns true if written, false if the
 * only difference would have been the timestamps (file left untouched).
 *
 * Safe with the "never wipe on failure" pattern: callers still early-return before
 * ever building `content` on a fetch failure / empty result — this only decides
 * whether an already-validated payload is worth rewriting.
 */
export function writeGeneratedFile(path: string, content: string): boolean {
  try {
    const existing = fs.readFileSync(path, 'utf8');
    if (normalize(existing) === normalize(content)) return false; // timestamp-only → skip
  } catch {
    // file doesn't exist yet → fall through and write it
  }
  fs.writeFileSync(path, content, 'utf8');
  return true;
}
