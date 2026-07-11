import { teamCommitmentHash } from "../../../packages/domain/src/commitment";
import { validateTeam, type DraftTeam, type FixturePlayer } from "../../../packages/domain/src";

export type ContestCommand = { contestId: string; wallet: string; idempotencyKey: string; now: Date };
export type ContestRecord = { contestId: string; lockAt: Date; scoringVersion: string; positionMappingVersion: string; state: "TEAM_BUILDING_OPEN" | "LOCKED" };
export type LockedTeamRecord = { contestId: string; wallet: string; canonicalTeamHash: string; canonicalJson: string; lockedAt: Date };
export type CommandStore = {
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  findCommand(idempotencyKey: string): Promise<LockedTeamRecord | null>;
  findContest(contestId: string): Promise<ContestRecord | null>;
  fixturePlayers(contestId: string): Promise<FixturePlayer[]>;
  saveLockedTeam(team: LockedTeamRecord): Promise<void>;
  recordCommand(idempotencyKey: string, result: LockedTeamRecord): Promise<void>;
};

export async function lockTeam(command: ContestCommand & { team: DraftTeam }, store: CommandStore): Promise<LockedTeamRecord> {
  return store.transaction(async () => {
    const prior = await store.findCommand(command.idempotencyKey); if (prior) return prior;
    const contest = await store.findContest(command.contestId); if (!contest || contest.state !== "TEAM_BUILDING_OPEN" || command.now >= contest.lockAt) throw new Error("This contest is locked.");
    const players = await store.fixturePlayers(command.contestId); const errors = validateTeam(command.team, players); if (errors.length) throw new Error(errors.join(" "));
    const input = { contestId: command.contestId, wallet: command.wallet, team: command.team, scoringVersion: contest.scoringVersion, positionMappingVersion: contest.positionMappingVersion };
    const record = { contestId: command.contestId, wallet: command.wallet, canonicalTeamHash: teamCommitmentHash(input), canonicalJson: JSON.stringify(input), lockedAt: command.now };
    await store.saveLockedTeam(record); await store.recordCommand(command.idempotencyKey, record); return record;
  });
}

