#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: scripts/with-txline-keychain.sh <command> [args...]" >&2
  exit 64
fi

export TXLINE_API_ORIGIN="${TXLINE_API_ORIGIN:-https://txline-dev.txodds.com}"
export TXLINE_API_TOKEN="$(security find-generic-password -a daze-txline-devnet -s daze-txline-api-token -w)"
exec "$@"
