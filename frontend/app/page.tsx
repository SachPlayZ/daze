import Link from "next/link";
import { DazeWordmark } from "./components/DazeWordmark";
import { HeroFilm } from "./components/HeroFilm";
import { LandingFormation } from "./components/LandingFormation";
import { LiveMatchCentre } from "./components/LiveMatchCentre";
import { OnboardingSheet } from "./components/OnboardingSheet";
import { ThemeToggle } from "./components/ThemeToggle";
import { WalletConnect } from "./components/WalletConnect";

const consequenceSteps = [
  { label: "Pitch event", value: "Goal" },
  { label: "Forward", value: "+4" },
  { label: "Captain", value: "×2" },
  { label: "Your total", value: "+8" },
  { label: "Rank", value: "Updates live" },
];

const proofItems = [
  { term: "Real TxLINE lineups", detail: "No hardcoded or scraped player fallback." },
  { term: "Deterministic scoring", detail: "Same verified sequence, same ledger result." },
  { term: "Solana devnet settlement", detail: "Entry and prize state stay independently verifiable." },
];

const buildSteps = [
  { title: "Choose a shape", detail: "Pick one of six supported formations." },
  { title: "Build from real lineups", detail: "Select eleven eligible players, never placeholders." },
  { title: "Name captain and vice", detail: "Captain doubles every positive and negative delta." },
  { title: "Lock, then follow", detail: "Watch each verified event change points and rank." },
];

export default function Home() {
  return (
    <main className="landing-v2">
      <nav className="nav landing-nav" aria-label="Main navigation">
        <DazeWordmark />
        <div className="nav-actions">
          <Link href="/fixtures">Fixtures</Link>
          <a href="#live">Live scoring</a>
          <Link href="/season">Season</Link>
          <OnboardingSheet />
          <ThemeToggle />
          <WalletConnect />
        </div>
      </nav>

      <section className="landing-hero" aria-labelledby="hero-title">
        <HeroFilm />
        <div className="landing-hero-copy">
          <p className="landing-kicker">Live World Cup fantasy, verified by TxLINE</p>
          <h1 id="hero-title">
            Every <em>moment</em>
            <br />
            changes your game.
          </h1>
          <p className="landing-hero-text">
            Build your XI from real lineups. Then see exactly how every verified
            goal, card, clean sheet, and correction changes your points.
          </p>
          <div className="landing-hero-actions">
            <Link className="primary-button landing-hero-primary" href="/fixtures">
              Explore fixtures <span aria-hidden="true">↗</span>
            </Link>
            <a className="landing-inline-link" href="#how-it-works">
              How scoring works <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="landing-hero-note">
            <span aria-hidden="true">✓</span>
            Real lineups only. Historical replays are clearly labelled.
          </p>
        </div>

        <ol className="landing-consequence" aria-label="Example fantasy scoring consequence">
          {consequenceSteps.map((step, index) => (
            <li key={step.label}>
              <span>{step.label}</span>
              <strong>{step.value}</strong>
              {index < consequenceSteps.length - 1 && <b aria-hidden="true">→</b>}
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-proof" aria-labelledby="proof-title">
        <div className="landing-proof-heading">
          <p>Verified, not vibes</p>
          <h2 id="proof-title">Every point has a receipt.</h2>
        </div>
        <dl>
          {proofItems.map((item) => (
            <div key={item.term}>
              <dt>{item.term}</dt>
              <dd>{item.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="landing-build" id="how-it-works" aria-labelledby="build-title">
        <div className="landing-build-copy">
          <p className="landing-section-label">From lineup to live consequence</p>
          <h2 id="build-title">
            Build eleven.
            <br />
            Follow every <em>consequence.</em>
          </h2>
          <p>
            The builder stays crisp and practical. The drama arrives only when
            a verified match event touches your XI.
          </p>
          <ol className="landing-build-steps">
            {buildSteps.map((step, index) => (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link className="landing-inline-link" href="/fixtures">
            Start with a fixture <span aria-hidden="true">→</span>
          </Link>
        </div>
        <LandingFormation />
      </section>

      <section className="landing-theatre" id="live" aria-labelledby="theatre-title">
        <div className="landing-theatre-intro">
          <p className="landing-section-label">Live consequence theatre</p>
          <h2 id="theatre-title">See every action. Know every consequence.</h2>
          <p>
            Provider event, affected player, base points, multiplier, total, and
            rank movement—explained from the committed scoring ledger.
          </p>
          <Link className="primary-button" href="/fixtures">
            Replay a completed fixture <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="landing-live-centre">
          <LiveMatchCentre />
        </div>
      </section>

      <section className="landing-details" aria-label="Additional Daze features">
        <article>
          <p className="landing-section-label">Market Pulse</p>
          <h2>Odds move. Your points don&apos;t.</h2>
          <p>
            When real odds exist, Daze can show the move around an event. They
            never affect fantasy points or payout, and missing data stays missing.
          </p>
        </article>
        <article>
          <p className="landing-section-label">Season table</p>
          <h2>One match, then the whole tournament.</h2>
          <p>
            Track cumulative points, best finishes, and captain outcomes across
            completed contests. Rankings never use stake size.
          </p>
          <Link className="landing-inline-link" href="/season">
            View season table <span aria-hidden="true">→</span>
          </Link>
        </article>
      </section>

      <section className="landing-closing" aria-labelledby="closing-title">
        <h2 id="closing-title">Your XI. Every consequence. Fully explained.</h2>
        <div>
          <p>TxLINE-verified events. Solana devnet settlement. No fabricated data.</p>
          <Link className="primary-button" href="/fixtures">
            Explore fixtures <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <DazeWordmark />
        <span>Powered by TxLINE · Built for Solana devnet</span>
        <span>© 2026 Daze</span>
      </footer>
    </main>
  );
}
