#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
exec uv run --python 3.12 scripts/src/main/nix/access.py "$@"
