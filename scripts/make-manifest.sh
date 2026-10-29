#!/usr/bin/env bash
# Writes a manifest of what the site serves: URL path -> SHA-256 of the file.
# Usage: make-manifest.sh <dist-dir> <git-sha> > manifest.json
set -euo pipefail

dist="${1:?dist directory required}"
sha="${2:?git sha required}"

cd "$dist"
find . -type f ! -name '_headers' ! -name '_redirects' | sort | while IFS= read -r f; do
  p="${f#./}"
  case "$p" in
    index.html) u="/" ;;
    */index.html) u="/${p%index.html}" ;;
    *) u="/$p" ;;
  esac
  printf '%s\t%s\n' "$u" "$(sha256sum "$f" | cut -d' ' -f1)"
done | jq -Rn --arg commit "$sha" '{commit: $commit, files: ([inputs | split("\t") | {(.[0]): .[1]}] | add)}'