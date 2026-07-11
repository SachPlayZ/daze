import { createHash } from "node:crypto";
import type { ProviderEnvelope } from "./contracts";

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

export function contentHash(raw: unknown): string { return createHash("sha256").update(stableJson(raw)).digest("hex"); }

export function sourceEventKey(event: ProviderEnvelope): string {
  if (event.connectionId && event.sequence && event.id) return `${event.fixtureId}:${event.connectionId}:${event.sequence}:${event.id}`;
  if (event.id) return `${event.fixtureId}:id:${event.id}`;
  if (event.timestamp) return `${event.fixtureId}:timestamp:${event.timestamp}:${contentHash(event.payload)}`;
  throw new Error("Provider event has no stable identity.");
}

