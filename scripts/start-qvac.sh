#!/usr/bin/env bash
set -euo pipefail

exec qvac serve openai --host 127.0.0.1 --port 11434 "$@"
