export type Position = "GK" | "DEF" | "MID" | "FWD";
export type Formation = "4-4-2" | "4-3-3" | "4-5-1" | "3-5-2" | "3-4-3" | "5-3-2";

export type FixturePlayer = {
  fixturePlayerId: string;
  participantId: string;
  preferredName: string;
  position: Position;
  eligible: boolean;
  starter?: boolean;
};

export type DraftTeam = {
  playerIds: string[];
  captainId: string;
  viceCaptainId: string;
  formation: Formation;
};

export const formationCounts: Record<Formation, Record<Position, number>> = {
  "4-4-2": { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  "4-3-3": { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  "4-5-1": { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  "3-5-2": { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  "3-4-3": { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  "5-3-2": { GK: 1, DEF: 5, MID: 3, FWD: 2 },
};

export function validateTeam(team: DraftTeam, players: FixturePlayer[]): string[] {
  const errors: string[] = [];
  const selected = team.playerIds.map((id) => players.find((player) => player.fixturePlayerId === id));
  if (team.playerIds.length !== 11) errors.push("Select exactly 11 players.");
  if (new Set(team.playerIds).size !== team.playerIds.length) errors.push("Each player can be selected once.");
  if (selected.some((player) => !player || !player.eligible)) errors.push("Every player must be eligible for this fixture.");
  if (!team.playerIds.includes(team.captainId)) errors.push("Choose a captain from your XI.");
  if (!team.playerIds.includes(team.viceCaptainId) || team.captainId === team.viceCaptainId) errors.push("Choose a different vice-captain from your XI.");
  const counts = selected.filter(Boolean).reduce<Record<Position, number>>((result, player) => {
    result[player!.position] += 1;
    return result;
  }, { GK: 0, DEF: 0, MID: 0, FWD: 0 });
  for (const [position, expected] of Object.entries(formationCounts[team.formation])) {
    if (counts[position as Position] !== expected) errors.push(`${team.formation} requires ${expected} ${position}.`);
  }
  const participantCounts = selected.filter(Boolean).reduce<Record<string, number>>((result, player) => {
    result[player!.participantId] = (result[player!.participantId] ?? 0) + 1;
    return result;
  }, {});
  if (Object.values(participantCounts).some((count) => count > 7)) errors.push("Select at most seven players from one team.");
  return errors;
}

/** Deterministic seeded selection; it proposes, never locks. */
export function quickPick(players: FixturePlayer[], formation: Formation, seed: number): DraftTeam | null {
  let state = seed >>> 0;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
  const target = formationCounts[formation];
  const selected: FixturePlayer[] = [];
  for (const position of Object.keys(target) as Position[]) {
    const candidates = players.filter((player) => player.eligible && player.position === position).sort((a, b) => Number(Boolean(b.starter)) - Number(Boolean(a.starter)) || a.fixturePlayerId.localeCompare(b.fixturePlayerId));
    for (let index = 0; index < target[position]; index += 1) {
      const valid = candidates.filter((player) => !selected.some((choice) => choice.fixturePlayerId === player.fixturePlayerId) && selected.filter((choice) => choice.participantId === player.participantId).length < 7);
      if (!valid.length) return null;
      selected.push(valid[Math.floor(random() * valid.length)]);
    }
  }
  return { playerIds: selected.map((player) => player.fixturePlayerId), captainId: selected[0].fixturePlayerId, viceCaptainId: selected[1].fixturePlayerId, formation };
}

export function canonicalTeamJson(team: DraftTeam, scoringVersion: string, mappingVersion: string): string {
  return JSON.stringify({ captainId: team.captainId, formation: team.formation, mappingVersion, playerIds: [...team.playerIds].sort(), scoringVersion, viceCaptainId: team.viceCaptainId });
}
