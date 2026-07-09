#!/usr/bin/env bash
set -u

BASE_URL="${QVAC_BASE_URL:-http://127.0.0.1:11434/v1}"
MODELS_URL="${BASE_URL%/}/models"
STATUS=0
TMP_DIR="${TMPDIR:-/tmp}/hermes-qvac-doctor.$$"
OUT_FILE="$TMP_DIR/out"
ERR_FILE="$TMP_DIR/err"

mkdir -p "$TMP_DIR"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

check() {
  local label="$1"
  shift
  if "$@" >"$OUT_FILE" 2>"$ERR_FILE"; then
    echo "ok - $label"
  else
    STATUS=1
    echo "fail - $label"
    sed 's/^/  /' "$ERR_FILE" 2>/dev/null | head -20
  fi
}

check "hermes command is installed" command -v hermes
check "qvac command is installed" command -v qvac
check "qvac --version works" qvac --version

if command -v curl >/dev/null 2>&1; then
  check "$MODELS_URL responds" curl -fsS "$MODELS_URL"
else
  STATUS=1
  echo "fail - curl command is installed"
fi

if command -v hermes >/dev/null 2>&1; then
  if hermes plugins list >"$OUT_FILE" 2>"$ERR_FILE"; then
    if grep -qi 'qvac' "$OUT_FILE"; then
      echo "ok - Hermes plugins list includes qvac"
    else
      STATUS=1
      echo "fail - Hermes plugins list includes qvac"
      sed 's/^/  /' "$OUT_FILE" 2>/dev/null | head -20
    fi
  else
    STATUS=1
    echo "fail - hermes plugins list works"
    sed 's/^/  /' "$ERR_FILE" 2>/dev/null | head -20
  fi

  echo "info - use interactive 'hermes model' to select provider qvac and a QVAC model"
fi

exit "$STATUS"
