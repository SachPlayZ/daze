/** Minimal in-process metrics registry and structured logger. No network calls, no DB, no clock assumptions beyond Date.now(). */

export type MetricName =
  | "txline_stream_connected"
  | "txline_last_event_age_seconds"
  | "txline_sequence_gap_total"
  | "txline_unknown_position_id_total"
  | "txline_unresolved_player_action_total"
  | "fixture_readiness_state"
  | "normalized_event_total"
  | "scoring_projection_latency_ms"
  | "scoring_correction_total"
  | "leaderboard_projection_latency_ms"
  | "telegram_delivery_success_total"
  | "telegram_delivery_failure_total"
  | "settlement_replay_mismatch_total"
  | "solana_entry_confirmation_seconds"
  | "solana_claim_confirmation_seconds";

type Counter = { kind: "counter"; value: number };
type Gauge = { kind: "gauge"; value: number };
type Histogram = { kind: "histogram"; samples: number[] };
type Metric = Counter | Gauge | Histogram;

const registry = new Map<string, Metric>();
const key = (name: MetricName, labels?: Record<string, string>) =>
  labels ? `${name}{${Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(",")}}` : name;

export function incrementCounter(name: MetricName, labels?: Record<string, string>, by = 1): void {
  const k = key(name, labels);
  const existing = registry.get(k);
  registry.set(k, { kind: "counter", value: (existing?.kind === "counter" ? existing.value : 0) + by });
}

export function setGauge(name: MetricName, value: number, labels?: Record<string, string>): void {
  registry.set(key(name, labels), { kind: "gauge", value });
}

export function observeHistogram(name: MetricName, value: number, labels?: Record<string, string>): void {
  const k = key(name, labels);
  const existing = registry.get(k);
  const samples = existing?.kind === "histogram" ? existing.samples : [];
  samples.push(value);
  registry.set(k, { kind: "histogram", samples: samples.slice(-500) });
}

export type MetricSnapshot = { key: string; kind: Metric["kind"]; value: number; count?: number; p50?: number; p95?: number };

/** Renders the current registry for a protected diagnostics endpoint. Never includes secrets — it only ever holds numbers. */
export function snapshotMetrics(): MetricSnapshot[] {
  return [...registry.entries()].map(([k, metric]) => {
    if (metric.kind === "histogram") {
      const sorted = [...metric.samples].sort((a, b) => a - b);
      const at = (p: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0;
      return { key: k, kind: metric.kind, value: sorted.reduce((sum, v) => sum + v, 0) / (sorted.length || 1), count: sorted.length, p50: at(0.5), p95: at(0.95) };
    }
    return { key: k, kind: metric.kind, value: metric.value };
  });
}

export function resetMetrics(): void { registry.clear(); }

export type LogLevel = "debug" | "info" | "warn" | "error";
/** Structured, single-line JSON logs so failures stay diagnosable per AGENTS.md 22 ("Logs and metrics make failure diagnosable"). */
export function log(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
