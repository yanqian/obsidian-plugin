#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but was not found." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  npm install
fi

npm run build

SMOKE_PORT="${SMOKE_PORT:-4173}"
export SMOKE_PORT

node scripts/smoke-server.mjs &
SERVER_PID="$!"

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in 1 2 3 4 5; do
  if node -e "fetch('http://127.0.0.1:' + process.env.SMOKE_PORT + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"; then
    break
  fi
  sleep 1
done

npm run smoke

echo "Project initialized successfully."
