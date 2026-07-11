"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WalletConnect, WALLET_EVENT } from "../components/WalletConnect";

function LinkFlow() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [wallet, setWallet] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "linking" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const linkAttempted = useRef(false);

  // Recover wallet from session on mount
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data: { wallet: string | null }) => {
        if (data.wallet) setWallet(data.wallet);
      })
      .catch(() => { /* ignore */ });
  }, []);

  // Listen for wallet-connect event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ wallet: string }>).detail;
      if (detail?.wallet) setWallet(detail.wallet);
    };
    window.addEventListener(WALLET_EVENT, handler);
    return () => window.removeEventListener(WALLET_EVENT, handler);
  }, []);

  // Auto-complete linking once wallet is known and token exists
  useEffect(() => {
    if (!wallet || !token || linkAttempted.current) return;
    linkAttempted.current = true;
    void (async () => {
      setStatus("linking");
      try {
        const res = await fetch("/api/telegram/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json() as { linked?: boolean; message?: string };
        if (data.linked) {
          setStatus("done");
          setMessage("Your Telegram account is now linked to your wallet. Head back to the bot and use /team, /points, or /settings.");
        } else {
          setStatus("error");
          setMessage(data.message ?? "Linking failed. Please request a new /link token.");
        }
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    })();
  }, [wallet, token]);

  if (!token) {
    return (
      <div style={{ padding: "1rem", background: "#fef3c7", borderRadius: 8, color: "#92400e" }}>
        No link token found. Please use the /link command in the Telegram bot to get a fresh link.
      </div>
    );
  }

  if (status === "done") {
    return (
      <div style={{ padding: "1rem", background: "#e6f9f0", borderRadius: 8, color: "#1a7a4a" }}>
        {message}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ padding: "1rem", background: "#fde8e8", borderRadius: 8, color: "#b91c1c" }}>
        {message}
      </div>
    );
  }

  if (!wallet) {
    return (
      <div>
        <p style={{ marginBottom: "1rem" }}>Step 1: connect your wallet to complete linking.</p>
        <WalletConnect />
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", background: "#eff6ff", borderRadius: 8, color: "#1d4ed8" }}>
      {status === "linking" ? "Linking your wallet…" : "Wallet connected. Processing…"}
    </div>
  );
}

export default function LinkPage() {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Link your wallet to Telegram</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Connect your wallet below to finish linking your Telegram account. You&apos;ll receive live score updates in the bot once linked.
      </p>
      <Suspense fallback={<div>Loading…</div>}>
        <LinkFlow />
      </Suspense>
    </main>
  );
}
