#!/usr/bin/env bash
set -e

# Ensure Node v16 is used
export PATH="/home/student/.nvm/versions/node/v16.20.2/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================="
echo " Running RENT & REUSE Platform Integration Tests"
echo " Node Version: $(node -v)"
echo " Workspace:    $SCRIPT_DIR"
echo "=================================================="

exec node test-api.js
