import { Reveal } from "./Reveal";

const states = [
  { label: "↓ Shortened", tone: "odds-move-shortened" },
  { label: "→ Stable", tone: "odds-move-flat" },
  { label: "↑ Lengthened", tone: "odds-move-lengthened" },
];

export function MarketPulseTeaser() {
  return <Reveal className="market-pulse-teaser">
    <section aria-labelledby="market-pulse-title">
      <div className="eyebrow">Market Pulse</div>
      <h2 id="market-pulse-title">Odds move. Your points don&apos;t.</h2>
      <p>See how market odds shifted around a scoring event — before and after, side by side. Purely informational: odds never touch your points or payout. Stale or missing odds are labelled, never faked.</p>
      <div className="market-pulse-states" aria-hidden="true">
        {states.map((state) => <span key={state.label} className={`odds-move-pill ${state.tone}`}>{state.label}</span>)}
      </div>
    </section>
  </Reveal>;
}
