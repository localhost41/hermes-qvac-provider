#!/usr/bin/env bash
set -u

BASE_URL="${QVAC_BASE_URL:-http://127.0.0.1:11434/v1}"
MODELS_URL="${BASE_URL%/}/models"
STATUS=0

check() {
  local label="$1"
  shift
  if "$@" >/tmp/hermes-qvac-doctor.out 2>/tmp/hermes-qvac-doctor.err; then
    echo "ok - $label"
  else
    STATUS=1
    echo "fail - $label"
    sed 's/^/  /' /tmp/hermes-qvac-doctor.err 2>/dev/null | head -20
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
  if hermes providers list 2>/tmp/hermes-qvac-doctor.err | grep -qi 'qvac'; then
    echo "ok - Hermes lists provider qvac"
  elif hermes model-providers list 2>/tmp/hermes-qvac-doctor.err | grep -qi 'qvac'; then
    echo "ok - Hermes lists provider qvac"
  else
    STATUS=1
    echo "warn - Hermes did not list provider qvac with known list commands"
    sed 's/^/  /' /tmp/hermes-qvac-doctor.err 2>/dev/null | head -20
  fi
fi

rm -f /tmp/hermes-qvac-doctor.out /tmp/hermes-qvac-doctor.err
exit "$STATUS"
