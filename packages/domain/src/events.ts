export type NormalizedSoccerEvent =
  | { kind: "MATCH_STARTED"; eventKey: string; elapsedSec: 0; revision: number }
  | { kind: "SUBSTITUTION"; eventKey: string; elapsedSec: number; playerInId: string; playerOutId: string; participantId: string; revision: number }
  | { kind: "GOAL"; eventKey: string; elapsedSec: number; scorerId: string; participantId: string; goalKind: "OPEN_PLAY" | "PENALTY" | "OWN_GOAL" | "UNKNOWN"; period: string; revision: number }
  | { kind: "PENALTY_ATTEMPT"; eventKey: string; elapsedSec: number; playerId: string; participantId: string; outcome: "SCORED" | "MISSED" | "RETAKE" | "UNKNOWN"; period: string; revision: number }
  | { kind: "CARD"; eventKey: string; elapsedSec: number; playerId: string; participantId: string; card: "YELLOW" | "DIRECT_RED" | "SECOND_YELLOW" | "UNKNOWN"; revision: number }
  | { kind: "MATCH_FINALIZED"; eventKey: string; elapsedSec: number; participant1Goals: number; participant2Goals: number; revision: number }
  | { kind: "ACTION_REPLACED"; eventKey: string; replacesEventKey: string; revision: number };

