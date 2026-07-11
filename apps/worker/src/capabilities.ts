import { capabilityRegistry } from "../../../packages/config/src/capabilities";
import type { Capability, ScoringAction } from "../../../packages/scoring/src/index";

/** Maps the provider capability registry onto scoring-action gates. Cards stay SHADOW/DISABLED until a real card payload is captured — no card action has ever been observed in captured TxLINE data. */
export function scoringCapabilities(): Partial<Record<ScoringAction, Capability>> {
  return {
    STARTING_APPEARANCE: capabilityRegistry.STARTER_STATUS.state,
    SUBSTITUTE_APPEARANCE: capabilityRegistry.SUBSTITUTION.state,
    APPEARANCE_60_REACHED: capabilityRegistry.MATCH_CLOCK.state,
    GOAL: capabilityRegistry.GOAL.state,
    PENALTY_GOAL: capabilityRegistry.PENALTY_GOAL.state,
    PENALTY_MISS: capabilityRegistry.PENALTY_MISS.state,
    OWN_GOAL: capabilityRegistry.OWN_GOAL.state,
    YELLOW_CARD: capabilityRegistry.YELLOW_CARD.state,
    DIRECT_RED_CARD: capabilityRegistry.RED_CARD.state,
    SECOND_YELLOW_ADJUSTMENT: capabilityRegistry.RED_CARD.state,
    CLEAN_SHEET: capabilityRegistry.GOAL.state,
    GOALS_CONCEDED: capabilityRegistry.GOAL.state,
  };
}
