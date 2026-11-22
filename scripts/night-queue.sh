#!/bin/bash
# Bash 3.2-compatible entrypoint. The legacy Markdown queue stays paused.
set -eu
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
exec node scripts/night-queue.mjs "$@"
