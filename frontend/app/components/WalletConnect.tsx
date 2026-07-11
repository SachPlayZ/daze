"use client";

import { useState } from "react";

type SolanaWallet = { isPhantom?: boolean; connect: () => Promise<{ publicKey: { toString(): string } }>; signMessage: (message: Uint8Array, display?: "utf8") => Promise<{ signature: Uint8Array }> };
declare global { interface Window { solana?: SolanaWallet } }

const signatureBase64 = (signature: Uint8Array) => {
  let text = "";
  for (const byte of signature) text += String.fromCharCode(byte);
  return btoa(text);
};

export function WalletConnect() {
  const [label, setLabel] = useState("Connect wallet");
  const [busy, setBusy] = useState(false);
  const connect = async () => {
    const wallet = window.solana;
    if (!wallet?.isPhantom) { setLabel("Install Phantom"); window.open("https://phantom.app/", "_blank", "noopener,noreferrer"); return; }
    setBusy(true); setLabel("Connecting…");
    try {
      const connection = await wallet.connect();
      const address = connection.publicKey.toString();
      const challengeResponse = await fetch("/api/auth/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet: address }) });
      if (!challengeResponse.ok) throw new Error();
      const challenge = await challengeResponse.json() as { nonce: string; message: string };
      const signed = await wallet.signMessage(new TextEncoder().encode(challenge.message), "utf8");
      const verified = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nonce: challenge.nonce, wallet: address, signature: signatureBase64(signed.signature) }) });
      if (!verified.ok) throw new Error();
      setLabel(`${address.slice(0, 4)}…${address.slice(-4)}`);
    } catch { setLabel("Try wallet again"); } finally { setBusy(false); }
  };
  return <button className="connect-button" disabled={busy} onClick={connect}>{label}</button>;
}
