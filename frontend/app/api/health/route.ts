import { NextResponse } from "next/server";
import { txlineFromEnvironment } from "../../../../packages/txline-client/src/index";

export const dynamic = "force-dynamic";

/** Never returns credentials; validates an authenticated provider read at request time. */
export async function GET() {
  const configured = Boolean(process.env.TXLINE_API_ORIGIN && process.env.TXLINE_API_TOKEN);
  if (!configured) return NextResponse.json({ provider: "TxLINE", state: "NOT_CONFIGURED", message: "TxLINE server credentials have not been configured." }, { headers: { "Cache-Control": "no-store" } });
  try {
    const fixtures = await txlineFromEnvironment().getJson<unknown>("/api/fixtures/snapshot");
    if (!Array.isArray(fixtures)) throw new Error("Fixture snapshot was not an array.");
    return NextResponse.json({ provider: "TxLINE", state: "CONNECTED", fixtureCount: fixtures.length, message: `Authenticated fixture snapshot available (${fixtures.length} fixtures).` }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ provider: "TxLINE", state: "UNAVAILABLE", message: "TxLINE could not be reached. Player selection remains closed until verified lineups load." }, { headers: { "Cache-Control": "no-store" } });
  }
}
