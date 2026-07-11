import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public chain readiness only; no wallet, token, or transaction data is returned. */
export async function GET() {
  const programId = process.env.NEXT_PUBLIC_FANTASY_POOL_PROGRAM_ID;
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  if (!programId) return NextResponse.json({ state: "PROGRAM_NOT_CONFIGURED", message: "Devnet contest entry opens after the fantasy-pool program is deployed." }, { headers: { "Cache-Control": "no-store" } });
  try {
    const account = await new Connection(rpcUrl, "confirmed").getAccountInfo(new PublicKey(programId), "confirmed");
    if (!account?.executable) return NextResponse.json({ state: "PROGRAM_NOT_DEPLOYED", message: "The configured fantasy-pool program is not executable on devnet." }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ state: "READY_FOR_CONTEST_CONFIGURATION", message: "Fantasy-pool program is deployed; contest configuration is next." }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ state: "CHAIN_UNAVAILABLE", message: "Devnet program status is unavailable. Try again shortly." }, { headers: { "Cache-Control": "no-store" } }); }
}
