import Link from "next/link";
import { ClosingCta } from "./components/ClosingCta";
import { DazeWordmark } from "./components/DazeWordmark";
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
    <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow">World Cup fantasy, live by TxLINE</p><h1 id="hero-title">Every moment<br /><em>changes your game.</em></h1><p className="hero-text">Build your XI around a real fixture. Every verified action changes your points, rank, and story.</p><Link className="primary-button" href="/fixtures">See today’s fixture <span aria-hidden="true">↓</span></Link></div><div className="hero-score" aria-label="Verified feed status"><span className="live-dot">● Feed status</span><div className="score-amount">—</div><div className="score-detail"><strong>Awaiting a verified fixture</strong><span>Points and rank appear only after durable provider events.</span></div><div className="rank-shift">No live score is fabricated</div></div></section>
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
