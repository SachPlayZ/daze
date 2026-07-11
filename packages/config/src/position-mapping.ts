import type { PositionMapping } from "../../domain/src/readiness";

/** TxODDS team-confirmed World Cup soccer mapping. */
export const txlineSoccerWorldCupV1: PositionMapping = {
  version: "txline-soccer-world-cup-v1",
  positionIds: { "34": "GK", "35": "DEF", "36": "MID", "37": "FWD" },
  unitIds: {},
  allowedUnitIds: ["0"],
  precedence: "POSITION_THEN_UNIT",
  capturedFromFixtureIds: ["18175981"],
  verifiedAt: "2026-07-11T00:00:00.000Z",
};
