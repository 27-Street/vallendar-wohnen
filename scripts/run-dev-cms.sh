#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CMS_PROXY_PORT="${CMS_PROXY_PORT:-8082}"
SITE_PORT="${SITE_PORT:-4321}"

cd "$ROOT_DIR"

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM

  if [[ -n "${CMS_PID:-}" ]] && kill -0 "$CMS_PID" 2>/dev/null; then
    kill "$CMS_PID" 2>/dev/null || true
  fi

  if [[ -n "${SITE_PID:-}" ]] && kill -0 "$SITE_PID" 2>/dev/null; then
    kill "$SITE_PID" 2>/dev/null || true
  fi

  wait 2>/dev/null || true
  exit "$exit_code"
}

trap cleanup EXIT INT TERM

echo "[dev:cms] Starting Decap proxy on http://localhost:${CMS_PROXY_PORT}"
PORT="$CMS_PROXY_PORT" npx decap-server &
CMS_PID=$!

echo "[dev:cms] Starting Astro dev server on http://localhost:${SITE_PORT}"
npm run dev -- --port "$SITE_PORT" &
SITE_PID=$!

echo "[dev:cms] CMS URL: http://localhost:${SITE_PORT}/admin/"
echo "[dev:cms] Press Ctrl+C to stop both processes."

while kill -0 "$CMS_PID" 2>/dev/null && kill -0 "$SITE_PID" 2>/dev/null; do
  sleep 1
done

if ! kill -0 "$CMS_PID" 2>/dev/null; then
  echo "[dev:cms] decap-server exited."
fi

if ! kill -0 "$SITE_PID" 2>/dev/null; then
  echo "[dev:cms] astro dev exited."
fi

exit 1
