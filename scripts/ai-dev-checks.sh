#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${ROOT_DIR}/musicxml-singer-with-oddvoices"

echo "Running AI dev checks from ${APP_DIR}"
cd "${APP_DIR}"

if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
  npm install
fi

npm run lint

if [[ "${RUN_ALL_TESTS:-0}" == "1" ]]; then
  npm test
else
  npx vitest run --exclude src/oddVoiceJSON/tests/graceNote.test.ts
fi
