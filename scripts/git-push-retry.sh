#!/usr/bin/env bash
# scripts/git-push-retry.sh
#
# Resilient push for the sync bots. Several sync workflows commit to `main`
# every few minutes; when two land together the second `git push` is rejected
# (non-fast-forward) and the whole run fails silently, leaving committed data
# stale (e.g. a live match never gets its stats → heatmap disappears).
#
# This rebases our just-made commit onto the latest remote and retries. Because
# each bot writes a *different* generated file, the rebase is conflict-free.
#
# Used by: every .github/workflows/sync-*.yml (replaces a bare `git push`).
# Detection of any staleness that slips through lives in scripts/check-data-health.ts.
set -uo pipefail

for attempt in 1 2 3 4 5; do
  if git push; then
    echo "✓ pushed (attempt ${attempt})"
    exit 0
  fi
  echo "⚠️  push rejected (attempt ${attempt}) — rebasing onto origin/main…"
  if ! git pull --rebase --autostash origin main; then
    echo "✗ rebase failed — aborting"
    git rebase --abort 2>/dev/null || true
    exit 1
  fi
  sleep $(( attempt * 2 ))
done

echo "✗ push still failing after 5 attempts"
exit 1
