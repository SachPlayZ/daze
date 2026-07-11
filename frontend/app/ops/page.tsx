"use client";

import { useState } from "react";

type CapabilityState = "VERIFIED" | "SHADOW" | "DISABLED";

interface Capability {
  key: string;
  state: CapabilityState;
  parserVersion: string;
  capturedFixtureIds: string[];
  samplePayloadPaths: string[];
  verifiedAt: string | null;
  notes: string;
}

interface PositionMapping {
  version: string;
  positionIds: Record<string, string>;
  unitIds: Record<string, string>;
  allowedUnitIds: string[];
  precedence: string;
  capturedFromFixtureIds: string[];
  verifiedAt: string | null;
}

interface ReadinessJson {
  ready: boolean;
  reasons: string[];
  unknownPositionIds: string[];
  unknownUnitIds: string[];
  players: unknown[];
}

interface Fixture {
  id: string;
  lifecycle: string;
  kickoff_at: string;
  feed_state: string;
  mapping_version: string | null;
  scoring_version: string | null;
  players_json: unknown;
  readiness_json: ReadinessJson | null;
  home_participant_id: string | null;
  away_participant_id: string | null;
  updated_at: string;
}

interface RawCount {
  fixture_id: string;
  count: string;
  latest_received_at: string;
}

interface NormCount {
  fixture_id: string;
  count: string;
}

interface Cursor {
  fixture_id: string;
  connection_id: string | null;
  last_sequence: string | null;
  updated_at: string;
}

interface DiagnosticsData {
  capabilities: Capability[];
  positionMapping: PositionMapping;
  fixtures: Fixture[];
  rawCounts: RawCount[];
  normalizedCounts: NormCount[];
  cursors: Cursor[];
  dbAvailable: boolean;
}

function stateClass(state: CapabilityState): string {
  if (state === "VERIFIED") return "status status-live";
  if (state === "SHADOW") return "status status-warning";
  return "status status-disabled";
}

function ageLabel(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 90) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 90) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function OpsPage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchDiagnostics() {
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/diagnostics?token=${encodeURIComponent(token)}`);
      if (res.status === 401) {
        setError("Invalid ops token — 401 unauthorized.");
        setData(null);
        return;
      }
      if (!res.ok) {
        setError(`Request failed: ${res.status}`);
        setData(null);
        return;
      }
      const json = (await res.json()) as DiagnosticsData;
      setData(json);
    } catch (e) {
      setError(String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      <p className="eyebrow">Internal diagnostics</p>
      <h1 style={{ fontSize: "2rem", letterSpacing: "-.04em", marginBottom: 8 }}>Ops — fixture readiness</h1>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
        Live data from DB + capability registry. Token is session-only, never stored.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 32, alignItems: "center" }}>
        <input
          type="password"
          placeholder="Ops access token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") fetchDiagnostics(); }}
          style={{
            minHeight: 44, padding: "0 14px", borderRadius: 10, border: "1px solid var(--border)",
            background: "var(--surface-raised)", color: "var(--foreground)", fontSize: 15, minWidth: 280,
          }}
        />
        <button className="primary-button" style={{ minHeight: 44, cursor: "pointer" }} onClick={fetchDiagnostics} disabled={loading}>
          {loading ? "Loading…" : "Load diagnostics"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "14px 16px", background: "var(--negative-surface)", color: "var(--negative)", borderRadius: 12, marginBottom: 24, fontSize: 14 }}>
          {error}
        </div>
      )}

      {!data && !error && !loading && (
        <div className="empty-state">
          <div className="empty-ball">🔐</div>
          <h3>Enter the ops token to load diagnostics</h3>
          <p>No data is shown without a valid token.</p>
        </div>
      )}

      {data && (
        <>
          {/* Capability registry */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: "1.2rem", letterSpacing: "-.03em", marginBottom: 12 }}>Capability registry</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--background-soft)", textAlign: "left" }}>
                    {["Key", "State", "Parser version", "Verified at", "Fixture IDs", "Notes"].map((h) => (
                      <th key={h} style={{ padding: "9px 12px", fontWeight: 700, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.capabilities.map((cap) => (
                    <tr key={cap.key} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "9px 12px", fontWeight: 600, fontFamily: "monospace" }}>{cap.key}</td>
                      <td style={{ padding: "9px 12px" }}>
                        <span className={stateClass(cap.state)}>{cap.state}</span>
                      </td>
                      <td style={{ padding: "9px 12px", fontFamily: "monospace", color: "var(--muted)" }}>{cap.parserVersion}</td>
                      <td style={{ padding: "9px 12px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {cap.verifiedAt ? new Date(cap.verifiedAt).toISOString().slice(0, 10) : "—"}
                      </td>
                      <td style={{ padding: "9px 12px", color: "var(--muted)" }}>{cap.capturedFixtureIds.join(", ") || "—"}</td>
                      <td style={{ padding: "9px 12px", color: "var(--muted)", maxWidth: 320 }}>{cap.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Position mapping */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: "1.2rem", letterSpacing: "-.03em", marginBottom: 4 }}>Position mapping</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
              Version: <code>{data.positionMapping.version}</code> · Precedence: {data.positionMapping.precedence} ·
              Verified: {data.positionMapping.verifiedAt ? data.positionMapping.verifiedAt.slice(0, 10) : "—"} ·
              From fixtures: {data.positionMapping.capturedFromFixtureIds.join(", ")}
            </p>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>POSITION IDS</p>
                <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--background-soft)" }}>
                      <th style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)" }}>positionId</th>
                      <th style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)" }}>role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.positionMapping.positionIds).map(([id, role]) => (
                      <tr key={id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "6px 12px", fontFamily: "monospace" }}>{id}</td>
                        <td style={{ padding: "6px 12px", fontWeight: 600 }}>{role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>ALLOWED UNIT IDS</p>
                <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 13 }}>
                  {data.positionMapping.allowedUnitIds.map((u) => <li key={u}><code>{u}</code></li>)}
                </ul>
              </div>
            </div>
          </section>

          {/* Per-fixture readiness */}
          <section>
            <h2 style={{ fontSize: "1.2rem", letterSpacing: "-.03em", marginBottom: 12 }}>
              Fixtures ({data.fixtures.length})
              {!data.dbAvailable && <span style={{ color: "var(--negative)", fontSize: 13, marginLeft: 12 }}>DB unavailable</span>}
            </h2>
            {data.fixtures.length === 0 ? (
              <div className="empty-state">
                <h3>No fixtures yet</h3>
                <p>Worker has not bootstrapped any fixtures into the DB.</p>
              </div>
            ) : (
              data.fixtures.map((fx) => {
                const raw = data.rawCounts.find((r) => r.fixture_id === fx.id);
                const norm = data.normalizedCounts.find((n) => n.fixture_id === fx.id);
                const cursor = data.cursors.find((c) => c.fixture_id === fx.id);
                const readiness = fx.readiness_json as ReadinessJson | null;
                const hasUnknownPos = (readiness?.unknownPositionIds?.length ?? 0) > 0;
                const hasUnknownUnit = (readiness?.unknownUnitIds?.length ?? 0) > 0;

                return (
                  <div key={fx.id} className="contest-card" style={{ marginBottom: 16 }}>
                    <div className="contest-topline">
                      <div>
                        <p className="eyebrow">Fixture</p>
                        <h2 style={{ fontSize: "1.1rem" }}>
                          {fx.id}
                          <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14, marginLeft: 10 }}>
                            {fx.home_participant_id ?? "?"} vs {fx.away_participant_id ?? "?"}
                          </span>
                        </h2>
                        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>
                          Kickoff: {new Date(fx.kickoff_at).toLocaleString()} · Updated: {ageLabel(fx.updated_at)}
                        </p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        <span className={`status ${fx.lifecycle === "LIVE" ? "status-live" : fx.lifecycle === "SCHEDULED" ? "status-warning" : ""}`}>
                          {fx.lifecycle}
                        </span>
                        {readiness && (
                          <span className={`status ${readiness.ready ? "status-live" : "status-warning"}`}>
                            {readiness.ready ? "Ready" : "Not ready"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 2 }}>FEED STATE</p>
                        <p style={{ fontSize: 14 }}>{fx.feed_state}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 2 }}>MAPPING VERSION</p>
                        <p style={{ fontSize: 13, fontFamily: "monospace" }}>{fx.mapping_version ?? "—"}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 2 }}>SCORING VERSION</p>
                        <p style={{ fontSize: 13, fontFamily: "monospace" }}>{fx.scoring_version ?? "—"}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 2 }}>RAW EVENTS</p>
                        <p style={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                          {raw ? raw.count : "0"}
                          {raw?.latest_received_at && (
                            <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>
                              latest {ageLabel(raw.latest_received_at)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 2 }}>NORMALIZED EVENTS</p>
                        <p style={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{norm ? norm.count : "0"}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 2 }}>PLAYERS (JSON)</p>
                        <p style={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                          {Array.isArray(fx.players_json) ? fx.players_json.length : "—"}
                        </p>
                      </div>
                    </div>

                    {cursor && (
                      <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
                        <strong>SSE cursor:</strong> connection {cursor.connection_id ?? "—"} · seq {cursor.last_sequence ?? "—"} · {ageLabel(cursor.updated_at)}
                      </div>
                    )}

                    {readiness && (
                      <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>READINESS GATES</p>
                        {readiness.reasons.length > 0 ? (
                          <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13, color: readiness.ready ? "var(--positive)" : "var(--warning)" }}>
                            {readiness.reasons.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        ) : (
                          <p style={{ fontSize: 13, color: "var(--muted)" }}>All gates passed — no blocking reasons.</p>
                        )}

                        {(hasUnknownPos || hasUnknownUnit) && (
                          <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--negative-surface)", color: "var(--negative)", borderRadius: 10, fontSize: 13 }}>
                            {hasUnknownPos && (
                              <p style={{ margin: "0 0 4px" }}>
                                <strong>Unknown positionIds:</strong>{" "}
                                {readiness.unknownPositionIds.map((id) => `${id}`).join(", ")}
                              </p>
                            )}
                            {hasUnknownUnit && (
                              <p style={{ margin: 0 }}>
                                <strong>Unknown unitIds:</strong>{" "}
                                {readiness.unknownUnitIds.join(", ")}
                              </p>
                            )}
                          </div>
                        )}

                        {!hasUnknownPos && !hasUnknownUnit && readiness.players?.length > 0 && (
                          <p style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>
                            {readiness.players.length} players mapped — no unknown IDs.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </>
      )}

      <style>{`.status-disabled { background: var(--negative-surface); color: var(--negative); }`}</style>
    </main>
  );
}
