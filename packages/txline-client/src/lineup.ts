import { asRecord } from "./contracts";

export type CapturedLineupPlayer = {
  fixturePlayerId: string;
  providerPlayerId: string;
  normativeId: string;
  participantId: string;
  preferredName: string;
  positionId: string;
  unitId: string;
  rosterNumber: string;
  starter: boolean;
  statusId: string;
};

const stringField = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];
  if (typeof value !== "string" && typeof value !== "number") throw new Error(`Lineup field ${key} is missing.`);
  return String(value);
};

/** Parses the captured `Action: lineups` shape; unknown/malformed records fail closed. */
export function parseLineupAction(raw: unknown): CapturedLineupPlayer[] {
  const root = asRecord(raw, "Lineup score record");
  if (root.Action !== "lineups") throw new Error("Expected a lineups action.");
  if (!Array.isArray(root.Lineups)) throw new Error("Lineup action has no Lineups array.");
  return root.Lineups.flatMap((group) => {
    const team = asRecord(group, "Lineup participant");
    const participantId = stringField(team, "id");
    if (!Array.isArray(team.lineups)) throw new Error("Lineup participant has no lineups array.");
    return team.lineups.map((lineup) => {
      const item = asRecord(lineup, "Lineup player");
      const player = asRecord(item.player, "Lineup player identity");
      if (typeof item.starter !== "boolean") throw new Error("Lineup player starter must be boolean.");
      return { fixturePlayerId: stringField(item, "fixturePlayerId"), providerPlayerId: stringField(player, "id"), normativeId: stringField(player, "normativeId"), participantId, preferredName: stringField(player, "preferredName"), positionId: stringField(item, "positionId"), unitId: stringField(item, "unitId"), rosterNumber: stringField(item, "rosterNumber"), starter: item.starter, statusId: stringField(item, "statusId") };
    });
  });
}

/** Captured fixture 18175981 proves soccer action player IDs join `player.normativeId`. */
export function resolveSoccerActionPlayer(actionPlayerId: string | number, lineup: CapturedLineupPlayer[]): CapturedLineupPlayer | null {
  return lineup.find((player) => player.normativeId === String(actionPlayerId)) ?? null;
}

