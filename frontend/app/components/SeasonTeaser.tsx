import Link from "next/link";
import { Reveal } from "./Reveal";

export function SeasonTeaser() {
  return <Reveal className="season-teaser">
    <section aria-labelledby="season-teaser-title" className="contest-card">
      <div className="contest-topline">
        <div><div className="eyebrow">Season</div><h2 id="season-teaser-title">One match. Then the whole season.</h2></div>
      </div>
      <p>Rankings run on points, not stake size. Track your standing fixture by fixture across the tournament.</p>
      <div className="judge-board" aria-hidden="true">
        <div><div><div className="eyebrow">Leaderboard</div><h3>Season leaders</h3></div><span className="status status-warning">All-time</span></div>
        <div className="judge-row"><span>#1</span><strong>—</strong><b>— pts</b></div>
        <div className="judge-row"><span>#2</span><strong>—</strong><b>— pts</b></div>
        <div className="judge-row"><span>#3</span><strong>—</strong><b>— pts</b></div>
      </div>
      <Link href="/season" className="secondary-button">View season table <span aria-hidden="true">→</span></Link>
    </section>
  </Reveal>;
}
