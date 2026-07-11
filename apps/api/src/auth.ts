import { createHmac, randomBytes, timingSafeEqual, verify as verifySignature } from "node:crypto";

export type WalletChallenge = { nonce: string; wallet: string; domain: string; issuedAt: string; expiresAt: string };
export type ChallengeStore = { save(challenge: WalletChallenge): Promise<void>; consume(nonce: string, wallet: string): Promise<WalletChallenge | null> };
export type SignatureVerifier = (message: Uint8Array, signature: Uint8Array, wallet: string) => Promise<boolean>;

/** Development fallback only; production must supply a durable ChallengeStore. */
const inMemoryChallenges = new Map<string, WalletChallenge>();
export const inMemoryChallengeStore: ChallengeStore = {
  save: async (challenge) => { inMemoryChallenges.set(challenge.nonce, challenge); },
  consume: async (nonce, wallet) => { const challenge = inMemoryChallenges.get(nonce); inMemoryChallenges.delete(nonce); return challenge?.wallet === wallet ? challenge : null; },
};

export function challengeMessage(challenge: WalletChallenge): string { return `Daze wants you to sign in with your Solana account:\n${challenge.wallet}\n\nDomain: ${challenge.domain}\nNonce: ${challenge.nonce}\nIssued At: ${challenge.issuedAt}\nExpiration Time: ${challenge.expiresAt}`; }
export async function issueChallenge(wallet: string, domain: string, store: ChallengeStore, now = new Date()): Promise<WalletChallenge> {
  if (!wallet || !domain) throw new Error("Wallet and domain are required.");
  const challenge = { nonce: randomBytes(24).toString("base64url"), wallet, domain, issuedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString() }; await store.save(challenge); return challenge;
}
export async function verifyChallenge(input: { nonce: string; wallet: string; signature: Uint8Array }, store: ChallengeStore, verify: SignatureVerifier, now = new Date()): Promise<boolean> {
  const challenge = await store.consume(input.nonce, input.wallet); if (!challenge || new Date(challenge.expiresAt) <= now) return false;
  return verify(new TextEncoder().encode(challengeMessage(challenge)), input.signature, input.wallet);
}

const base58Alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function decodeBase58(value: string): Uint8Array {
  if (!value) throw new Error("Wallet is required.");
  const bytes = [0];
  for (const character of value) {
    const digit = base58Alphabet.indexOf(character);
    if (digit < 0) throw new Error("Wallet is not base58.");
    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) { const next = bytes[index] * 58 + carry; bytes[index] = next & 0xff; carry = next >> 8; }
    while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (const character of value) { if (character !== "1") break; bytes.push(0); }
  return Uint8Array.from(bytes.reverse());
}

export function isSolanaPublicKey(value: string): boolean {
  try { return decodeBase58(value).length === 32; } catch { return false; }
}

/** Verifies a detached Ed25519 signature against a Solana base58 public key. */
export const verifySolanaSignature: SignatureVerifier = async (message, signature, wallet) => {
  try {
    const publicKey = decodeBase58(wallet);
    if (publicKey.length !== 32 || signature.length !== 64) return false;
    const subjectPublicKeyInfo = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(publicKey)]);
    return verifySignature(null, Buffer.from(message), { key: subjectPublicKeyInfo, format: "der", type: "spki" }, Buffer.from(signature));
  } catch { return false; }
};

export type WalletSession = { wallet: string; expiresAt: string };
export function createSession(session: WalletSession, secret: string): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}
export function readSession(token: string | undefined, secret: string, now = new Date()): WalletSession | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try { const session = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as WalletSession; return typeof session.wallet === "string" && typeof session.expiresAt === "string" && new Date(session.expiresAt) > now ? session : null; } catch { return null; }
}
