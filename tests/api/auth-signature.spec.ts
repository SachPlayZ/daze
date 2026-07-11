import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { createSession, isSolanaPublicKey, issueChallenge, readSession, verifyChallenge, verifySolanaSignature } from "../../apps/api/src/auth";

const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const encodeBase58 = (bytes: Uint8Array) => {
  const digits = [0];
  for (const byte of bytes) { let carry = byte; for (let index = 0; index < digits.length; index += 1) { const next = digits[index] * 256 + carry; digits[index] = next % 58; carry = Math.floor(next / 58); } while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); } }
  for (const byte of bytes) { if (byte !== 0) break; digits.push(0); }
  return digits.reverse().map((digit) => alphabet[digit]).join("");
};
void (async () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const der = publicKey.export({ format: "der", type: "spki" }) as Buffer;
  const wallet = encodeBase58(der.subarray(-32));
  assert.equal(isSolanaPublicKey(wallet), true);
  assert.equal(isSolanaPublicKey("not-a-wallet"), false);
  const items = new Map<string, { nonce: string; wallet: string; domain: string; issuedAt: string; expiresAt: string }>();
  const store = { save: async (challenge: { nonce: string; wallet: string; domain: string; issuedAt: string; expiresAt: string }) => { items.set(challenge.nonce, challenge); }, consume: async (nonce: string, candidate: string) => { const challenge = items.get(nonce); items.delete(nonce); return challenge?.wallet === candidate ? challenge : null; } };
  const challenge = await issueChallenge(wallet, "daze.test", store, new Date("2026-07-11T00:00:00.000Z"));
  const signature = sign(null, new TextEncoder().encode(`Daze wants you to sign in with your Solana account:\n${challenge.wallet}\n\nDomain: ${challenge.domain}\nNonce: ${challenge.nonce}\nIssued At: ${challenge.issuedAt}\nExpiration Time: ${challenge.expiresAt}`), privateKey);
  assert.equal(await verifyChallenge({ nonce: challenge.nonce, wallet, signature }, store, verifySolanaSignature, new Date("2026-07-11T00:01:00.000Z")), true);
  assert.equal(await verifySolanaSignature(new TextEncoder().encode("wrong message"), signature, wallet), false);
  const token = createSession({ wallet, expiresAt: "2026-07-12T00:00:00.000Z" }, "test-secret");
  assert.equal(readSession(token, "test-secret", new Date("2026-07-11T01:00:00.000Z"))?.wallet, wallet);
  assert.equal(readSession(`${token}x`, "test-secret"), null);
})().catch((error) => { throw error; });
