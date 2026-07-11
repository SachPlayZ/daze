import { createHash } from "node:crypto";

export type SettlementLeaf = { entryPublicKey: Uint8Array; amount: bigint };
export type MerklePayout = SettlementLeaf & { leaf: Uint8Array; proof: Uint8Array[] };

const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function decodeSolanaAddress(value: string): Uint8Array {
  const bytes = [0];
  for (const character of value) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error("Invalid base58 address.");
    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) { const next = bytes[index] * 58 + carry; bytes[index] = next & 255; carry = next >> 8; }
    while (carry) { bytes.push(carry & 255); carry >>= 8; }
  }
  for (const character of value) { if (character !== "1") break; bytes.push(0); }
  const result = Uint8Array.from(bytes.reverse());
  if (result.length !== 32) throw new Error("Solana address must decode to 32 bytes.");
  return result;
}
function sha256(...parts: Uint8Array[]): Uint8Array { const hash = createHash("sha256"); parts.forEach((part) => hash.update(part)); return new Uint8Array(hash.digest()); }
function u64le(value: bigint): Uint8Array { if (value < 0n || value > 0xffff_ffff_ffff_ffffn) throw new Error("Payout amount is out of range."); const bytes = new Uint8Array(8); let next = value; for (let index = 0; index < 8; index += 1) { bytes[index] = Number(next & 255n); next >>= 8n; } return bytes; }
function compare(left: Uint8Array, right: Uint8Array): number { for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return left[index] - right[index]; return 0; }
export function settlementLeaf(entryPublicKey: Uint8Array, amount: bigint): Uint8Array { if (entryPublicKey.length !== 32) throw new Error("Entry public key must have 32 bytes."); return sha256(entryPublicKey, u64le(amount)); }
export function hashSettlementPair(left: Uint8Array, right: Uint8Array): Uint8Array { return compare(left, right) <= 0 ? sha256(left, right) : sha256(right, left); }

/** Builds proofs compatible with fantasy-pool::verify_merkle. Empty payouts are rejected. */
export function buildSettlementPayouts(leaves: SettlementLeaf[]): { root: Uint8Array; payouts: MerklePayout[] } {
  if (!leaves.length) throw new Error("Settlement needs at least one payout.");
  const seen = new Set<string>();
  const payouts = leaves.map((item) => {
    if (item.amount <= 0n) throw new Error("Payout must be positive.");
    const key = Buffer.from(item.entryPublicKey).toString("hex"); if (seen.has(key)) throw new Error("Duplicate settlement entry."); seen.add(key);
    return { ...item, leaf: settlementLeaf(item.entryPublicKey, item.amount), proof: [] as Uint8Array[] };
  });
  let level = payouts.map((_, index) => ({ hash: payouts[index].leaf, members: [index] }));
  while (level.length > 1) {
    const next: typeof level = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index]; const right = level[index + 1];
      if (!right) { next.push(left); continue; }
      left.members.forEach((member) => payouts[member].proof.push(right.hash));
      right.members.forEach((member) => payouts[member].proof.push(left.hash));
      next.push({ hash: hashSettlementPair(left.hash, right.hash), members: [...left.members, ...right.members] });
    }
    level = next;
  }
  return { root: level[0].hash, payouts };
}
export function verifySettlementProof(leaf: Uint8Array, proof: Uint8Array[], root: Uint8Array): boolean { return proof.reduce((node, sibling) => hashSettlementPair(node, sibling), leaf).every((byte, index) => byte === root[index]); }
