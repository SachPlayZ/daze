"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag } from "../lib/flags";

type DbFixture = { fixtureId: string; kickoffAt: string; homeTeamName: string | null; awayTeamName: string | null; competition: string | null; feedState: string };
type ReplayFixture = { fixtureId: string; teams: string; goals: number; ready: boolean };

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
      <div className="contest-topline"><div><div className="eyebrow">Replay</div><h2 id="replay-list-title">Play a match that already happened</h2></div></div>
      {replays === null && <div className="empty-state"><span aria-hidden="true" className="empty-ball">◌</span><h3>Loading captured fixtures</h3><p>Reading verified TxLINE replay captures.</p></div>}
      {replays !== null && replays.length === 0 && <div className="empty-state"><span aria-hidden="true" className="empty-ball">◌</span><h3>No replays captured yet</h3><p>No historical fixtures with a confirmed lineup are available.</p></div>}
      {replays !== null && replays.length > 0 && <div className="fixture-list">
        {replays.map((fixture) => { const [home, away] = fixture.teams.split(" vs "); return <Link href={`/replay/${fixture.fixtureId}`} className="fixture-row fixture-row-link" key={fixture.fixtureId}>
          <div><strong className="team-name-flag"><Flag countryName={home} />{home}{away && <><span>vs</span><Flag countryName={away} />{away}</>}</strong><small>{fixture.goals} verified goal{fixture.goals === 1 ? "" : "s"}</small></div>
          <span className="status status-live">Replay ready</span>
        </Link>; })}
      </div>}
    </section>
  </>;
}
