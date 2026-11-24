#!/bin/sh
# Keeps apps/<app>/package-lock.json in sync with its package.json.
#
# The Docker images install with `npm ci` against that per-app lock, while
# `npm install` at the repo root only updates the workspace lock. So adding a
# dependency leaves the image build failing with
#   npm error Missing: <pkg> from lock file
# until this runs.
#
# Run it after adding or removing a dependency, then commit the lock.
set -eu
cd "$(dirname "$0")/.."

for app in web api; do
  dir=$(mktemp -d)
  cp "apps/$app/package.json" "$dir/"
  cp "apps/$app/package-lock.json" "$dir/" 2>/dev/null || true

  if ( cd "$dir" && npm ci --dry-run --no-audit --no-fund >/dev/null 2>&1 ); then
    echo "apps/$app: up to date"
  else
    rm -f "$dir/package-lock.json"
    ( cd "$dir" && npm install --package-lock-only --ignore-scripts --no-audit --no-fund >/dev/null )
    cp "$dir/package-lock.json" "apps/$app/package-lock.json"
    echo "apps/$app: regenerated"
  fi

  rm -rf "$dir"
done
