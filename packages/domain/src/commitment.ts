import { createHash } from "node:crypto";
import type { DraftTeam } from "./index";

export type TeamCommitment = { contestId: string; wallet: string; team: DraftTeam; scoringVersion: string; positionMappingVersion: string };
export function canonicalCommitmentJson(input: TeamCommitment): string {
  return JSON.stringify({ captainId: input.team.captainId, contestId: input.contestId, formation: input.team.formation, playerIds: [...input.team.playerIds].sort(), positionMappingVersion: input.positionMappingVersion, scoringVersion: input.scoringVersion, viceCaptainId: input.team.viceCaptainId, wallet: input.wallet });
}
export function teamCommitmentHash(input: TeamCommitment): string { return createHash("sha256").update(canonicalCommitmentJson(input)).digest("hex"); }

