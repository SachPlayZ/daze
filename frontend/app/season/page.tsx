import Link from "next/link";
import { DazeWordmark } from "../components/DazeWordmark";
import { OnboardingSheet } from "../components/OnboardingSheet";
import { SeasonTable } from "../components/SeasonTable";
import { ThemeToggle } from "../components/ThemeToggle";
import { WalletConnect } from "../components/WalletConnect";

export default function Season() {
  return <main>
    <nav className="nav" aria-label="Main navigation"><DazeWordmark /><div className="nav-actions"><Link href="/">Contest</Link><OnboardingSheet /><ThemeToggle /><WalletConnect /></div></nav>
    <section className="season-page"><SeasonTable /></section>
    <footer><DazeWordmark /><span>Powered by TxLINE · Built for Solana devnet</span><span>© 2026 Daze</span></footer>
  </main>;
}
