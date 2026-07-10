#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cd "$ROOT_DIR"

npm pack --json --pack-destination "$TMP_DIR" >"$TMP_DIR/pack.json"

TARBALL_NAME="$(
  node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); console.log(data[0].filename);" "$TMP_DIR/pack.json"
)"
TARBALL_PATH="$TMP_DIR/$TARBALL_NAME"

if [[ ! -f "$TARBALL_PATH" ]]; then
  echo "Packed tarball was not created at $TARBALL_PATH" >&2
  exit 1
fi

tar -tf "$TARBALL_PATH" >"$TMP_DIR/contents.txt"

require_file() {
  local file="$1"
  if ! grep -Fxq "package/$file" "$TMP_DIR/contents.txt"; then
    echo "Packed tarball is missing package/$file" >&2
    exit 1
  fi
}

reject_path() {
  local path="$1"
  if grep -Fq "$path" "$TMP_DIR/contents.txt"; then
    echo "Packed tarball unexpectedly includes $path" >&2
    exit 1
  fi
}

require_file "package.json"
require_file "README.md"
require_file "CHANGELOG.md"
require_file "LICENSE"
require_file "__init__.py"
require_file "plugin.yaml"
require_file "dist/index.js"
require_file "dist/index.d.ts"
require_file "docs/architecture-notes.md"
require_file "examples/hermes-qvac-demo.mjs"
require_file "qvac_provider/__init__.py"
require_file "scripts/doctor.sh"
require_file "scripts/install.sh"
require_file "scripts/start-qvac.sh"

reject_path "node_modules/"
reject_path "__pycache__/"
reject_path ".pyc"
reject_path "test/"
reject_path "tests/"
reject_path ".git/"

echo "ok - package tarball contains expected runtime assets: $TARBALL_NAME"
