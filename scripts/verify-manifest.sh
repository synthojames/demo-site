#!/usr/bin/env bash
# Compares the live site against manifest.json. Exits 1 on any mismatch.
# Usage: verify-manifest.sh <base-url> <manifest.json>
set -euo pipefail

base="${1:?base url required}"
manifest="${2:?manifest path required}"
bad=0

while IFS=$'\t' read -r path expected; do
  actual=$(curl -fsS --max-time 20 "${base}${path}" | sha256sum | cut -d' ' -f1) || actual="FETCH-FAILED"
  if [ "$actual" = "$expected" ]; then
    echo "OK       ${path}"
  else
    echo "MISMATCH ${path} expected=${expected} actual=${actual}"
    bad=1
  fi
done < <(jq -r '.files | to_entries[] | "\(.key)\t\(.value)"' "$manifest")

exit "$bad"