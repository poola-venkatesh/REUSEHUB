#!/usr/bin/env bash
set -e

# Ensure Node v16 is used
export PATH="/home/student/.nvm/versions/node/v16.20.2/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================="
echo " Starting RENT & REUSE Platform (REUSEHUB)"
echo " Node Version: $(node -v)"
echo " Workspace:    $SCRIPT_DIR"
echo "=================================================="

# Check if port 5000 is already in use
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 5000 is already in use. Checking health..."
    if curl -s http://127.0.0.1:5000/api/health >/dev/null ; then
        echo "✅ Platform is already running and healthy at http://localhost:5000"
        exit 0
    else
        echo "Killing stale process on port 5000..."
        fuser -k 5000/tcp || true
        sleep 1
    fi
fi

exec node server/index.js
