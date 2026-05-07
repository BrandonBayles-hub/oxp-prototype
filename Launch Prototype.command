#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
PORT=8787

if [[ ! -f out/index.html ]]; then
  echo ""
  echo "  No static export found (missing out/index.html)."
  echo "  From this folder run:  npm install && npm run build"
  echo ""
  exit 1
fi

echo ""
echo "  ┌──────────────────────────────────────────────┐"
echo "  │                                              │"
echo "  │   OXP Studio — Entrata Agentic Platform      │"
echo "  │                                              │"
echo "  │   Prototype: http://127.0.0.1:$PORT/          │"
echo "  │   Press Ctrl+C to stop.                      │"
echo "  │                                              │"
echo "  └──────────────────────────────────────────────┘"
echo ""

# Python http.server breaks many Next static assets; use the same server as npm run start.
npx --yes serve@latest out -l "$PORT" &
SERVE_PID=$!
trap 'kill $SERVE_PID 2>/dev/null' EXIT

for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sS -o /dev/null "http://127.0.0.1:$PORT/" 2>/dev/null; then
    break
  fi
  sleep 0.4
done

open "http://127.0.0.1:$PORT/getting-started/"
wait "$SERVE_PID"
