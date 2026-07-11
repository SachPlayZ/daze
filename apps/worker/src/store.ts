import type { Pool } from "pg";
import type { IngestionStore, RawEvent } from "./ingestion";

/** Postgres-backed ingestion store. Single-process worker projects synchronously after persist, so enqueueProjection is a no-op marker. */
export function postgresIngestionStore(pool: Pool, endpointOrStream: string): IngestionStore {
  return {
    async hasContentHash(hash: string): Promise<boolean> {
      const result = await pool.query("select 1 from raw_provider_events where content_hash = $1 limit 1", [hash]);
      return (result.rowCount ?? 0) > 0;
    },
    async persist(input: RawEvent): Promise<void> {
      await pool.query(
        `insert into raw_provider_events (fixture_id, source_event_key, revision, content_hash, provider_timestamp, received_at, endpoint_or_stream, raw_json)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (content_hash) do nothing`,
        [input.fixtureId, input.sourceEventKey, input.revision, input.contentHash, input.providerTimestamp, input.receivedAt, endpointOrStream, JSON.stringify(input.raw)],
      );
    },
    async advanceCursor(fixtureId: string, connectionId: string | null, sequence: string | null): Promise<void> {
      if (!sequence) return;
      await pool.query(
        `insert into provider_cursors (fixture_id, connection_id, last_sequence, updated_at) values ($1, $2, $3, now())
         on conflict (fixture_id) do update set connection_id = excluded.connection_id, last_sequence = excluded.last_sequence, updated_at = now()`,
        [fixtureId, connectionId, sequence],
      );
    },
    async enqueueProjection(): Promise<void> {},
  };
}
