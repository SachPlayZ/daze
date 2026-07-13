import Link from "next/link";
import { DazeWordmark } from "../../components/DazeWordmark";
import { OnboardingSheet } from "../../components/OnboardingSheet";
import { ReplayBuilder } from "../../components/ReplayBuilder";
import { ThemeToggle } from "../../components/ThemeToggle";
import { WalletConnect } from "../../components/WalletConnect";

export default async function ReplayFixture({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  return <main>
    <nav className="nav" aria-label="Main navigation"><DazeWordmark /><div className="nav-actions"><Link href="/">Contest</Link><Link href="/fixtures">Fixtures</Link><OnboardingSheet /><ThemeToggle /><WalletConnect /></div></nav>
    <section className="content-grid content-grid-single" id="contest"><ReplayBuilder fixtureId={fixtureId} /></section>
    <footer><DazeWordmark /><span>Powered by TxLINE · Built for Solana devnet</span><span>© 2026 Daze</span></footer>
  </main>;
}
