import { TxlineClient } from "../../../packages/txline-client/src/index";
import { parseLineupAction, type CapturedLineupPlayer } from "../../../packages/txline-client/src/lineup";
import { evaluateFixtureReadiness, type ProviderLineupPlayer, type FixtureReadiness } from "../../../packages/domain/src/readiness";
import { txlineSoccerWorldCupV1 } from "../../../packages/config/src/position-mapping";

export type FixtureLineup = { readiness: FixtureReadiness; captured: CapturedLineupPlayer[] };

function evaluateLineup(fixtureId: string, captured: CapturedLineupPlayer[]): FixtureLineup {
  const providerLineup: ProviderLineupPlayer[] = captured.map((player) => ({
    fixturePlayerId: player.fixturePlayerId,
    participantId: player.participantId,
    preferredName: player.preferredName,
    positionId: player.positionId,
    unitId: player.unitId,
    starter: player.starter,
  }));
  return { readiness: evaluateFixtureReadiness(fixtureId, providerLineup, txlineSoccerWorldCupV1), captured };
}

/** Restart recovery uses the latest durably stored confirmed lineup when the completed fixture leaves the live snapshot. */
export function fixtureLineupFromStoredActions(rawActions: unknown[], fixtureId: string): FixtureLineup | null {
  const lineupRecord = [...rawActions].reverse().find((item) => item && typeof item === "object" && !Array.isArray(item)
    && (item as Record<string, unknown>).Action === "lineups" && (item as Record<string, unknown>).Confirmed === true);
  if (!lineupRecord) return null;
  try { return evaluateLineup(fixtureId, parseLineupAction(lineupRecord)); } catch { return null; }
}

/** Loads and evaluates the current lineup for one fixture from a TxLINE score snapshot. Fail-closed on missing/ambiguous data. */
export async function loadFixtureLineup(client: TxlineClient, fixtureId: string): Promise<FixtureLineup | null> {
  const snapshot = await client.getJson<unknown[]>(`/api/scores/snapshot/${fixtureId}`);
  if (!Array.isArray(snapshot)) return null;
  const lineupRecord = snapshot.find((item) => item && typeof item === "object" && (item as Record<string, unknown>).Action === "lineups");
  if (!lineupRecord) return null;
  return evaluateLineup(fixtureId, parseLineupAction(lineupRecord));
}
