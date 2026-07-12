"use client";

import { useState } from "react";

type ProofStatus = "provisional" | "settled" | "reconciled";

type ReceiptBadgeProps = {
  fixtureId: string;
  sourceEventKey: string;
  providerTimestamp: string | null;
  contentHash: string | null;
  proofStatus: ProofStatus;
  txSignature?: string | null;
};

const statusCopy: Record<ProofStatus, string> = {
  provisional: "Provisional, awaiting reconciliation",
  reconciled: "Reconciled, settlement pending",
  settled: "Settled on Solana devnet",
};

export function ReceiptBadge({ fixtureId, sourceEventKey, providerTimestamp, contentHash, proofStatus, txSignature }: ReceiptBadgeProps) {
  const [open, setOpen] = useState(false);
  const label = proofStatus === "provisional" ? "Provisional" : "Verified by TxLINE";
  return <span className="receipt">
    <button type="button" className={`receipt-pill receipt-${proofStatus}`} aria-expanded={open} onClick={() => setOpen((current) => !current)}>{label}</button>
    {open && <span className="receipt-detail" role="note">
      <span><b>Fixture</b><em>{fixtureId}</em></span>
      <span><b>Provider sequence</b><em>{sourceEventKey}</em></span>
      <span><b>Provider timestamp</b><em>{providerTimestamp ? new Date(providerTimestamp).toLocaleString() : "—"}</em></span>
      <span><b>Content hash</b><em>{contentHash ? `${contentHash.slice(0, 12)}…` : "—"}</em></span>
      <span><b>Proof status</b><em>{statusCopy[proofStatus]}</em></span>
      {txSignature && <span><b>Settlement tx</b><em><a href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer">View on Solana Explorer ↗</a></em></span>}
    </span>}
  </span>;
}
