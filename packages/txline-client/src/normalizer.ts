import type { NormalizedSoccerEvent } from "../../domain/src/events";

/** Endpoint-specific adapters are written only against captured provider payloads. */
export type CapturedActionAdapter = { parserVersion: string; normalize(raw: unknown): NormalizedSoccerEvent | null };
export type NormalizedRecord = { parserVersion: string; normalized: NormalizedSoccerEvent | null; quarantined: boolean; reason: string | null };

export function normalizeCapturedAction(raw: unknown, adapter: CapturedActionAdapter): NormalizedRecord {
  try {
    const normalized = adapter.normalize(raw);
    return normalized ? { parserVersion: adapter.parserVersion, normalized, quarantined: false, reason: null } : { parserVersion: adapter.parserVersion, normalized: null, quarantined: true, reason: "Unsupported or unknown provider action." };
  } catch {
    return { parserVersion: adapter.parserVersion, normalized: null, quarantined: true, reason: "Provider action failed runtime normalization." };
  }
}

