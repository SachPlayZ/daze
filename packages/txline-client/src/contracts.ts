/** Runtime contracts for untrusted TxLINE JSON. Unknown fields remain in raw storage. */
export type UnknownRecord = Record<string, unknown>;

export type ProviderEnvelope = { fixtureId: string; id: string | null; connectionId: string | null; sequence: string | null; revision: string | null; timestamp: string | null; payload: UnknownRecord };

export function asRecord(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as UnknownRecord;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

/** Deliberately conservative: real captures must supply endpoint adapter tests before use. */
export function parseProviderEnvelope(value: unknown): ProviderEnvelope {
  const record = asRecord(value, "Provider envelope");
  const fixtureId = stringOrNull(record.fixtureId ?? record.FixtureId);
  if (!fixtureId) throw new Error("Provider envelope missing fixture ID.");
  return {
    fixtureId,
    id: stringOrNull(record.id ?? record.Id),
    connectionId: stringOrNull(record.connectionId ?? record.ConnectionId),
    sequence: stringOrNull(record.sequence ?? record.Sequence ?? record.seq),
    revision: stringOrNull(record.revision ?? record.Revision),
    timestamp: stringOrNull(record.timestamp ?? record.Timestamp ?? record.providerTimestamp),
    payload: record,
  };
}

