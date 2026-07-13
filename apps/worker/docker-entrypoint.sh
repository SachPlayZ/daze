#!/bin/sh
set -e

# Most hosts (Railway, Fly.io, Render, ...) make plain env vars easy and file-mounted
# secrets inconvenient or platform-specific. The worker code itself only knows how to
# read a keypair from a file (SOLANA_KEYPAIR_PATH, same convention as the manual
# preflight-fantasy-*.mjs scripts) — so if the raw keypair JSON was handed in as an
# env var instead, write it to a file here and point SOLANA_KEYPAIR_PATH at it before
# the real process starts. If SOLANA_KEYPAIR_PATH is already set to a real, mounted
# file, this is a no-op.
if [ -n "$SOLANA_KEYPAIR_JSON" ]; then
  echo "$SOLANA_KEYPAIR_JSON" > /app/keypair.json
  export SOLANA_KEYPAIR_PATH=/app/keypair.json
fi

exec "$@"
