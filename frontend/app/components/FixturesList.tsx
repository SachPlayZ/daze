"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag } from "../lib/flags";

type DbFixture = { fixtureId: string; kickoffAt: string; homeTeamName: string | null; awayTeamName: string | null; competition: string | null; feedState: string };
type ReplayFixture = { fixtureId: string; teams: string; score: string | null; eventCount: number; ready: boolean; state: "READY" | "LINEUP_UNAVAILABLE" };

function FixtureTeams({ teams }: { teams: string }) {
  const [home, away] = teams.split(" vs ");
  return <strong className="team-name-flag"><Flag countryName={home} />{home}{away && <><span>vs</span><Flag countryName={away} />{away}</>}</strong>;
}

export function FixturesList() {
  const [upcoming, setUpcoming] = useState<DbFixture[] | null>(null);
  const [replays, setReplays] = useState<ReplayFixture[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/fixtures", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<{ fixtures: DbFixture[] }> : { fixtures: [] } as { fixtures: DbFixture[] }).then((data) => { if (active) setUpcoming(data.fixtures.filter((fixture) => new Date(fixture.kickoffAt).getTime() > Date.now())); }).catch(() => { if (active) setUpcoming([]); });
    fetch("/api/replay", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<{ fixtures: ReplayFixture[] }> : { fixtures: [] } as { fixtures: ReplayFixture[] }).then((data) => { if (active) setReplays(data.fixtures); }).catch(() => { if (active) setReplays([]); });
    return () => { active = false; };
  }, []);

  return <>
    <section className="contest-card fixtures-section" aria-labelledby="upcoming-title">
      <div className="contest-topline"><div><div className="eyebrow">Upcoming</div><h2 id="upcoming-title">Sourced live from TxLINE</h2></div></div>
      {upcoming === null && <div className="empty-state"><span aria-hidden="true" className="empty-ball">◌</span><h3>Loading fixtures</h3><p>Checking the TxLINE-synced schedule.</p></div>}
      {upcoming !== null && upcoming.length === 0 && <div className="empty-state"><span aria-hidden="true" className="empty-ball">◌</span><h3>No upcoming fixtures yet</h3><p>TxLINE hasn&apos;t published new fixtures. This list grows as the provider adds them.</p></div>}
      {upcoming !== null && upcoming.length > 0 && <div className="fixture-list">
        {upcoming.map((fixture) => <div className="fixture-row" key={fixture.fixtureId}>
          <div><strong className="team-name-flag"><Flag countryName={fixture.homeTeamName} />{fixture.homeTeamName || "Team pending"}<span>vs</span><Flag countryName={fixture.awayTeamName} />{fixture.awayTeamName || "Team pending"}</strong><small>{fixture.competition || "Competition pending"} · {new Date(fixture.kickoffAt).toLocaleString()}</small></div>
          <span className="status status-warning">Player list pending</span>
        </div>)}
      </div>}
    </section>
    <section className="contest-card fixtures-section" aria-labelledby="replay-list-title">
      <div className="contest-topline"><div><div className="eyebrow">Past</div><h2 id="replay-list-title">Completed TxLINE fixtures</h2></div></div>
      {replays === null && <div className="empty-state"><span aria-hidden="true" className="empty-ball">◌</span><h3>Loading completed fixtures</h3><p>Reading durable TxLINE match sequences.</p></div>}
      {replays !== null && replays.length === 0 && <div className="empty-state"><span aria-hidden="true" className="empty-ball">◌</span><h3>No completed fixtures yet</h3><p>Finished TxLINE fixtures will appear here automatically.</p></div>}
      {replays !== null && replays.length > 0 && <div className="fixture-list">
        {replays.map((fixture) => fixture.ready ? <Link href={`/replay/${fixture.fixtureId}`} className="fixture-row fixture-row-link" key={fixture.fixtureId}>
          <div><FixtureTeams teams={fixture.teams} /><small>{fixture.score ? `${fixture.score} final` : "Final score unavailable"} · {fixture.eventCount} provider events</small></div>
          <span className="status status-live">Replay ready</span>
        </Link> : <div className="fixture-row" key={fixture.fixtureId}>
          <div><FixtureTeams teams={fixture.teams} /><small>{fixture.eventCount} provider events · confirmed lineup unavailable</small></div>
          <span className="status status-warning">Lineup unavailable</span>
        </div>)}
      </div>}
    </section>
  </>;
}
