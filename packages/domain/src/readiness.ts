import type { FixturePlayer, Position } from "./index";

export type PositionMapping = {
  version: string;
  positionIds: Record<string, Position>;
  unitIds: Record<string, Position>;
  /** Known unit IDs that classify a provider taxonomy but do not map to one fantasy position. */
  allowedUnitIds?: string[];
  precedence: "POSITION_THEN_UNIT" | "UNIT_THEN_POSITION";
  capturedFromFixtureIds: string[];
  verifiedAt: string;
};

export type ProviderLineupPlayer = {
  fixturePlayerId: string;
  participantId: string;
  preferredName: string;
  positionId: string | null;
  unitId: string | null;
  starter?: boolean;
};

export type FixtureReadiness = {
  ready: boolean;
  reasons: string[];
  unknownPositionIds: string[];
  unknownUnitIds: string[];
  players: FixturePlayer[];
};

function resolvePosition(player: ProviderLineupPlayer, mapping: PositionMapping): Position | null {
  const fromPosition = player.positionId ? mapping.positionIds[player.positionId] : undefined;
  const fromUnit = player.unitId ? mapping.unitIds[player.unitId] : undefined;
  const unitIsAllowed = !player.unitId || Boolean(fromUnit) || mapping.allowedUnitIds?.includes(player.unitId);
  if ((player.positionId && !fromPosition) || !unitIsAllowed) return null;
  if (fromPosition && fromUnit && fromPosition !== fromUnit) return null;
  return mapping.precedence === "POSITION_THEN_UNIT" ? fromPosition ?? fromUnit ?? null : fromUnit ?? fromPosition ?? null;
}

export function evaluateFixtureReadiness(fixtureId: string, lineup: ProviderLineupPlayer[], mapping: PositionMapping): FixtureReadiness {
  const reasons: string[] = [];
  const unknownPositionIds = new Set<string>();
  const unknownUnitIds = new Set<string>();
  const ids = new Set<string>();
  const participants = new Set<string>();
  const players = lineup.map((player) => {
    participants.add(player.participantId);
    if (ids.has(player.fixturePlayerId)) reasons.push(`Duplicate fixture player ID: ${player.fixturePlayerId}.`);
    ids.add(player.fixturePlayerId);
    if (!player.preferredName.trim()) reasons.push(`Missing player name: ${player.fixturePlayerId}.`);
    if (player.positionId && !mapping.positionIds[player.positionId]) unknownPositionIds.add(player.positionId);
    if (player.unitId && !mapping.unitIds[player.unitId] && !mapping.allowedUnitIds?.includes(player.unitId)) unknownUnitIds.add(player.unitId);
    const position = resolvePosition(player, mapping);
    if (!position) reasons.push(`Unresolved or conflicting position for ${player.fixturePlayerId}.`);
    return { fixturePlayerId: player.fixturePlayerId, participantId: player.participantId, preferredName: player.preferredName, position: position ?? "FWD", eligible: Boolean(position), starter: player.starter };
  });
  if (participants.size !== 2) reasons.push("Fixture needs two distinct participants.");
  const eligible = players.filter((player) => player.eligible);
  if (eligible.filter((player) => player.position === "GK").length < 2) reasons.push("Fixture needs at least two eligible goalkeepers.");
  for (const position of ["DEF", "MID", "FWD"] as Position[]) if (!eligible.some((player) => player.position === position)) reasons.push(`Fixture has no eligible ${position}.`);
  if (unknownPositionIds.size) reasons.push("Unknown provider position IDs require mapping evidence.");
  if (unknownUnitIds.size) reasons.push("Unknown provider unit IDs require mapping evidence.");
  return { ready: reasons.length === 0, reasons: [...new Set(reasons)], unknownPositionIds: [...unknownPositionIds], unknownUnitIds: [...unknownUnitIds], players };
}
