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

require_installed_file() {
  local file="$1"
  if [[ ! -f "$INSTALLED_PACKAGE_DIR/$file" ]]; then
    echo "Installed npm package is missing $file" >&2
    exit 1
  fi
}

require_copied_plugin_file() {
  local file="$1"
  if [[ ! -f "$INSTALLED_PLUGIN_DIR/$file" ]]; then
    echo "Copied Hermes plugin is missing $file" >&2
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

CONSUMER_DIR="$TMP_DIR/npm-consumer"
mkdir -p "$CONSUMER_DIR"

printf '{"private":true,"type":"module"}\n' >"$CONSUMER_DIR/package.json"

(
  cd "$CONSUMER_DIR"
  npm install \
    --offline \
    --ignore-scripts \
    --no-audit \
    --no-fund \
    --cache "$TMP_DIR/npm-cache" \
    "$TARBALL_PATH" >/dev/null
)

INSTALLED_PACKAGE_DIR="$CONSUMER_DIR/node_modules/@localhost41/hermes-qvac-provider"
if [[ ! -d "$INSTALLED_PACKAGE_DIR" ]]; then
  echo "Installed npm package was not created at $INSTALLED_PACKAGE_DIR" >&2
  exit 1
fi

require_installed_file "package.json"
require_installed_file "dist/index.js"
require_installed_file "dist/index.d.ts"
require_installed_file "__init__.py"
require_installed_file "plugin.yaml"
require_installed_file "qvac_provider/__init__.py"
require_installed_file "scripts/install.sh"
require_installed_file "scripts/doctor.sh"
require_installed_file "scripts/start-qvac.sh"

(
  cd "$CONSUMER_DIR"
  node --input-type=module <<'EOF'
import {
  DEFAULT_QVAC_MODEL,
  createHermesQvacProvider,
  hermesQvacProvider,
} from "@localhost41/hermes-qvac-provider";

const provider = createHermesQvacProvider();

if (DEFAULT_QVAC_MODEL !== "qwen3.5-9b") {
  throw new Error(`Unexpected default model: ${DEFAULT_QVAC_MODEL}`);
}

if (provider.id !== "qvac" || provider.protocol !== "openai-compatible") {
  throw new Error(`Unexpected provider descriptor: ${JSON.stringify(provider)}`);
}

if (hermesQvacProvider.defaultModel !== DEFAULT_QVAC_MODEL) {
  throw new Error("Default provider export does not use the default QVAC model");
}
EOF
)

PYTHONPATH="$INSTALLED_PACKAGE_DIR" python3 <<'EOF'
import qvac_provider

profile = qvac_provider.register()

if getattr(profile, "name", None) != "qvac":
    raise SystemExit(f"Unexpected provider profile name: {profile!r}")

if getattr(profile, "default_model", None) != "qwen3.5-9b":
    raise SystemExit(f"Unexpected default model: {profile!r}")
EOF

HERMES_HOME="$TMP_DIR/hermes-home" bash "$INSTALLED_PACKAGE_DIR/scripts/install.sh" --copy >/dev/null
INSTALLED_PLUGIN_DIR="$TMP_DIR/hermes-home/plugins/model-providers/qvac"

if [[ ! -d "$INSTALLED_PLUGIN_DIR" || -L "$INSTALLED_PLUGIN_DIR" ]]; then
  echo "Copied Hermes plugin was not created as a real directory at $INSTALLED_PLUGIN_DIR" >&2
  exit 1
fi

require_copied_plugin_file "__init__.py"
require_copied_plugin_file "plugin.yaml"
require_copied_plugin_file "qvac_provider/__init__.py"
require_copied_plugin_file "scripts/install.sh"
require_copied_plugin_file "scripts/doctor.sh"
require_copied_plugin_file "scripts/start-qvac.sh"

echo "ok - package tarball installs and verifies runtime assets: $TARBALL_NAME"
