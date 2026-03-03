#!/bin/bash
cd "$(dirname "$0")/out"
PORT=8787
echo ""
echo "  ┌──────────────────────────────────────────────┐"
echo "  │                                              │"
echo "  │   OXP Studio — Entrata Agentic Platform      │"
echo "  │                                              │"
echo "  │   Prototype running at:                      │"
echo "  │   http://localhost:$PORT                      │"
echo "  │                                              │"
echo "  │   Press Ctrl+C to stop the server.           │"
echo "  │                                              │"
echo "  └──────────────────────────────────────────────┘"
echo ""
sleep 1
open "http://localhost:$PORT/getting-started"
python3 -m http.server $PORT
