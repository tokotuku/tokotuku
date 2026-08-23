#!/bin/sh

set -eu

if command -v bunx >/dev/null 2>&1; then
  exec bunx biome "$@"
fi

native_biome="$(find node_modules -type f -path '*/@biomejs/cli-*/biome' -perm -111 -print -quit 2>/dev/null || true)"
if [ -n "$native_biome" ]; then
  exec "$native_biome" "$@"
fi

if [ -x node_modules/.bin/biome ]; then
  exec node_modules/.bin/biome "$@"
fi

echo "Biome executable not found. Install dependencies before committing." >&2
exit 127
