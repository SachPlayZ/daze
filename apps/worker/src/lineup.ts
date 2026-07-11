import { TxlineClient } from "../../../packages/txline-client/src/index";
import { parseLineupAction, type CapturedLineupPlayer } from "../../../packages/txline-client/src/lineup";
import { evaluateFixtureReadiness, type ProviderLineupPlayer, type FixtureReadiness } from "../../../packages/domain/src/readiness";
import { txlineSoccerWorldCupV1 } from "../../../packages/config/src/position-mapping";

export type FixtureLineup = { readiness: FixtureReadiness; captured: CapturedLineupPlayer[] };

/** Loads and evaluates the current lineup for one fixture from a TxLINE score snapshot. Fail-closed on missing/ambiguous data. */
export async function loadFixtureLineup(client: TxlineClient, fixtureId: string): Promise<FixtureLineup | null> {
  const snapshot = await client.getJson<unknown[]>(`/api/scores/snapshot/${fixtureId}`);
  if (!Array.isArray(snapshot)) return null;
  const lineupRecord = snapshot.find((item) => item && typeof item === "object" && (item as Record<string, unknown>).Action === "lineups");
  if (!lineupRecord) return null;
  const captured = parseLineupAction(lineupRecord);
  const providerLineup: ProviderLineupPlayer[] = captured.map((player) => ({
    fixturePlayerId: player.fixturePlayerId,
    participantId: player.participantId,
    preferredName: player.preferredName,
    positionId: player.positionId,
    unitId: player.unitId,
    starter: player.starter,
  }));
  const readiness = evaluateFixtureReadiness(fixtureId, providerLineup, txlineSoccerWorldCupV1);
  return { readiness, captured };
}
