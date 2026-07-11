#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
rpc_url="https://api.devnet.solana.com"
binary="$root/programs/fantasy-pool/target/deploy/fantasy_pool.so"
# Anchor synchronizes this keypair with declare_id! and Anchor.toml.
program_keypair="$root/target/deploy/fantasy_pool-keypair.json"

[[ -f "$binary" ]] || { echo "Missing SBF binary. Run cargo-build-sbf first." >&2; exit 1; }
[[ -f "$program_keypair" ]] || { echo "Missing program keypair." >&2; exit 1; }

program_id="$(solana-keygen pubkey "$program_keypair")"
wallet="$(solana address --url "$rpc_url")"
balance="$(solana balance --url "$rpc_url" "$wallet")"
sha256="$(shasum -a 256 "$binary" | awk '{print $1}')"

if [[ "${1:-}" != "--send" ]]; then
  printf '{"mode":"dry-run","cluster":"devnet","programId":"%s","deployer":"%s","balance":"%s","binarySha256":"%s"}\n' "$program_id" "$wallet" "$balance" "$sha256"
  exit 0
fi

echo "Deploying $program_id to devnet from $wallet."
NO_DNA=1 solana program deploy --url "$rpc_url" --program-id "$program_keypair" "$binary"
