#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$ROOT_DIR/dist/cli.js"
if [[ ! -f "$CLI" ]]; then
  echo "hermes-qvac is not built; run 'pnpm build' first" >&2
  exit 4
fi
exec node "$CLI" doctor "$@"
