#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HERMES_ROOT="${HERMES_HOME:-$HOME/.hermes}"
TARGET_DIR="$HERMES_ROOT/plugins/model-providers/qvac"
MODE="${1:---symlink}"

mkdir -p "$(dirname "$TARGET_DIR")"

if [[ -e "$TARGET_DIR" || -L "$TARGET_DIR" ]]; then
  rm -rf "$TARGET_DIR"
fi

case "$MODE" in
  --copy)
    mkdir -p "$TARGET_DIR"
    cp -R "$SOURCE_DIR/__init__.py" "$SOURCE_DIR/plugin.yaml" "$SOURCE_DIR/qvac_provider" "$SOURCE_DIR/scripts" "$TARGET_DIR/"
    ;;
  --symlink)
    ln -s "$SOURCE_DIR" "$TARGET_DIR"
    ;;
  *)
    echo "Usage: $0 [--symlink|--copy]" >&2
    exit 2
    ;;
esac

echo "Installed QVAC Hermes provider at $TARGET_DIR"
echo "Set QVAC_API_KEY=custom-local if Hermes requires an API key value."
