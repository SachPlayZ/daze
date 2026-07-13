import { correctionMessage, pointImpactMessage, rankChangeMessage } from "../../../packages/telegram/src";
import type { LedgerRow } from "../../../packages/scoring/src";

export type HistoricalReplayNotification = { idempotencyKey: string; text: string; kind: "HISTORICAL_POINT_IMPACT" | "HISTORICAL_CORRECTION" | "HISTORICAL_RANK_CHANGE" };

/** Builds DMs only from the rows committed by an isolated historical replay session. */
export function historicalReplayNotifications(input: {
  telegramUserId: string;
  sessionId: string;
  entryId: string;
  rows: LedgerRow[];
  playerNames: Map<string, string>;
  minute: number | null;
  previousTotal: number;
  nextTotal: number;
  previousRank: number | null;
  nextRank: number | null;
  contestUrl: string;
}): HistoricalReplayNotification[] {
  const relevant = input.rows.filter((row) => row.entryId === input.entryId);
  const reversed = relevant.filter((row) => row.reversed);
  const rows = relevant.filter((row) => !row.reversed);
  let runningTotal = input.previousTotal;
  const notifications: HistoricalReplayNotification[] = [];
  if (reversed.length) {
    const sourceEventKey = `historical:${input.sessionId}:${reversed[0]!.sourceEventKey}:correction`;
    notifications.push({
      idempotencyKey: `${input.telegramUserId}:${sourceEventKey}:${reversed.map((row) => row.sourceRevision).sort().join("|")}:CORRECTION`,
      kind: "HISTORICAL_CORRECTION",
      text: correctionMessage({ previousImpact: -reversed.reduce((sum, row) => sum + row.appliedPoints, 0), correctedImpact: rows.reduce((sum, row) => sum + row.appliedPoints, 0), newTotal: input.nextTotal, contestUrl: input.contestUrl }),
    });
  }
  notifications.push(...rows.map((row) => {
    const before = runningTotal;
    runningTotal += row.appliedPoints;
    const sourceEventKey = `historical:${input.sessionId}:${row.sourceEventKey}:${row.action}:${row.playerId}`;
    return {
      idempotencyKey: `${input.telegramUserId}:${sourceEventKey}:${row.sourceRevision}:POINT_IMPACT`,
      kind: "HISTORICAL_POINT_IMPACT" as const,
      text: pointImpactMessage({
        minute: input.minute,
        action: row.action.replaceAll("_", " "),
        playerName: input.playerNames.get(row.playerId) ?? "Selected player",
        basePoints: row.basePoints,
        appliedPoints: row.appliedPoints,
        previousTotal: before,
        nextTotal: runningTotal,
        previousRank: null,
        nextRank: null,
        contestUrl: input.contestUrl,
      }),
    };
  }));
  if (input.previousRank !== null && input.nextRank !== null && input.previousRank !== input.nextRank) {
    const sourceEventKey = `historical:${input.sessionId}:rank:${input.previousRank}:${input.nextRank}:${input.nextTotal}`;
    notifications.push({
      idempotencyKey: `${input.telegramUserId}:${sourceEventKey}:1:RANK_CHANGE`,
      kind: "HISTORICAL_RANK_CHANGE",
      text: rankChangeMessage({ previousRank: input.previousRank, nextRank: input.nextRank, contestUrl: input.contestUrl }),
    });
  }
  return notifications;
}
