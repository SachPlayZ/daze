import Link from "next/link";
import { DazeWordmark } from "../components/DazeWordmark";
import { FixturesList } from "../components/FixturesList";
import { OnboardingSheet } from "../components/OnboardingSheet";
import { ThemeToggle } from "../components/ThemeToggle";
import { WalletConnect } from "../components/WalletConnect";

export default function Fixtures() {
  return <main>
    <nav className="nav" aria-label="Main navigation"><DazeWordmark /><div className="nav-actions"><Link href="/">Contest</Link><Link href="/season">Season</Link><OnboardingSheet /><ThemeToggle /><WalletConnect /></div></nav>
    <section className="fixtures-page"><FixturesList /></section>
    <footer><DazeWordmark /><span>Powered by TxLINE · Built for Solana devnet</span><span>© 2026 Daze</span></footer>
  </main>;
}
