import { contentHash, sourceEventKey } from "../../../packages/txline-client/src/identity";
import { parseProviderEnvelope } from "../../../packages/txline-client/src/contracts";

export type RawEvent = { sourceEventKey: string; revision: string; fixtureId: string; contentHash: string; receivedAt: string; providerTimestamp: string | null; raw: unknown };
export type IngestionStore = { hasContentHash(hash: string): Promise<boolean>; persist(input: RawEvent): Promise<void>; advanceCursor(fixtureId: string, connectionId: string | null, sequence: string | null): Promise<void>; enqueueProjection(sourceEventKey: string, revision: string): Promise<void> };

/** Caller must make persist/cursor atomic in its DB implementation. */
export async function ingestProviderMessage(raw: unknown, store: IngestionStore, receivedAt = new Date().toISOString()): Promise<{ accepted: boolean; event?: RawEvent }> {
  const envelope = parseProviderEnvelope(raw);
  const hash = contentHash(raw);
  if (await store.hasContentHash(hash)) return { accepted: false };
  const event = { sourceEventKey: sourceEventKey(envelope), revision: envelope.revision ?? hash, fixtureId: envelope.fixtureId, contentHash: hash, receivedAt, providerTimestamp: envelope.timestamp, raw };
  await store.persist(event);
  await store.enqueueProjection(event.sourceEventKey, event.revision);
  await store.advanceCursor(event.fixtureId, envelope.connectionId, envelope.sequence);
  return { accepted: true, event };
}

