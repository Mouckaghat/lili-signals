#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" — decides whether a production deploy should run,
# based on WHAT CHANGED, not on the commit message. Set it in:
#   Vercel → Project → Settings → Git → Ignored Build Step:
#       bash scripts/vercel-should-build.sh
#
# Vercel's contract for this command is inverted on purpose:
#   exit 1  → PROCEED with the build (deploy)
#   exit 0  → IGNORE / cancel the build (skip)
#
# Why this exists: the sync bots commit generated data every few minutes with
# `[skip ci]` so they don't trigger a rebuild storm (live data is served at
# runtime via /api/*, so the baked files don't change the deployed bundle). But
# a `[skip ci]` bot commit landing on top of a real code change made Vercel skip
# the deploy of that code change too (it lost the standings fix this way, twice).
#
# This script removes that footgun: a commit that touches ONLY generated data
# files is skipped; ANYTHING else (app/, components/, lib logic, api/, config,
# package*) always deploys — regardless of commit message or what's on top.
#
# Fail-safe: on any error or ambiguity, BUILD (exit 1). Never silently skip a
# real change.

set -uo pipefail

# Generated, bot-refreshed files. A commit touching only these needs no redeploy.
DATA_PATTERN='^(lib/.*Data\.ts|lib/wc-data-generated\.ts|action/.*\.(md|json))$'

# Compare the deployed commit to its parent. Vercel checks out enough history
# for HEAD^; if it can't be resolved (e.g. first build, shallow clone), build.
if ! changed=$(git diff --name-only HEAD^ HEAD 2>/dev/null); then
  echo "↪ Cannot compute diff (HEAD^ missing) — building to be safe."
  exit 1
fi

if [ -z "$changed" ]; then
  echo "↪ Empty diff — building to be safe."
  exit 1
fi

# If any changed file is NOT a generated-data file, this is a real change → build.
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if ! printf '%s\n' "$f" | grep -Eq "$DATA_PATTERN"; then
    echo "✓ Code/config change detected ($f) — building."
    exit 1
  fi
done <<< "$changed"

echo "⏭  Data-only commit (live data served at runtime) — skipping build."
echo "   changed files:"
printf '     %s\n' $changed
exit 0
