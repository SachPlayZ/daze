import Link from "next/link";
import { ClosingCta } from "./components/ClosingCta";
import { DazeWordmark } from "./components/DazeWordmark";
import { HeroFilm } from "./components/HeroFilm";
import { LiveMatchCentre } from "./components/LiveMatchCentre";
import { MarketPulseTeaser } from "./components/MarketPulseTeaser";
import { OnboardingSheet } from "./components/OnboardingSheet";
import { ProofBand } from "./components/ProofBand";
import { SeasonTeaser } from "./components/SeasonTeaser";
import { ThemeToggle } from "./components/ThemeToggle";
import { WalletConnect } from "./components/WalletConnect";

export default function Home() {
  return <main>
    <nav className="nav" aria-label="Main navigation"><DazeWordmark /><div className="nav-actions"><Link href="/fixtures">Fixtures</Link><Link href="/season">Season</Link><OnboardingSheet /><ThemeToggle /><WalletConnect /></div></nav>
    <section className="hero hero-cinematic" aria-labelledby="hero-title">
      <HeroFilm />
      <div className="hero-copy">
        <p className="eyebrow">Live World Cup fantasy · Powered by TxLINE</p>
        <h1 id="hero-title">Every <em>moment</em><br />changes your game.</h1>
        <p className="hero-text">Build your XI from real lineups. Then feel every verified goal, card, clean sheet, and rank change.</p>
        <div className="hero-actions">
          <Link className="primary-button hero-primary" href="/fixtures">Explore fixtures <span className="button-arrow" aria-hidden="true">↗</span></Link>
          <Link className="hero-text-link" href="#how-it-works">How scoring works <span aria-hidden="true">↓</span></Link>
        </div>
        <div className="hero-integrity">
          <span className="hero-integrity-mark" aria-hidden="true">✓</span>
          <p><strong>Verified events only.</strong> Join when lineups are ready, or replay a completed fixture.</p>
        </div>
      </div>
    </section>
    <ProofBand />
    <div className="content-grid-intro"><div className="eyebrow">No account, no risk</div><p>Explore covered fixtures, then build your XI against a real historical replay or an available contest.</p></div>
    <section className="content-grid content-grid-single" id="contest"><aside className="rules-card" id="how-it-works"><div className="eyebrow">The rules</div><h2>Captain doubles. Vice covers.</h2><ol><li><span>01</span>Choose 11 players from verified lineups.</li><li><span>02</span>Name a captain — they score double — and a vice, who only steps in if captain never takes the pitch.</li><li><span>03</span>Lock your team before kickoff.</li></ol><p className="disclosure">One entry per wallet per fixture. Rankings use points—not stake size.</p></aside></section>
    <MarketPulseTeaser />
    <section className="live-section" id="live"><LiveMatchCentre /></section>
    <SeasonTeaser />
    <ClosingCta />
    <footer><DazeWordmark /><span>Powered by TxLINE · Built for Solana devnet</span><span>© 2026 Daze</span></footer>
  </main>;
}
