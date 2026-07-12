import { Reveal } from "./Reveal";

export function ClosingCta() {
  return <Reveal className="closing-cta">
    <section aria-labelledby="closing-cta-title">
      <h2 id="closing-cta-title">Build your XI. Feel every verified moment.</h2>
      <p>Solana devnet settlement. TxLINE-verified data. No fabricated events, ever.</p>
      <a className="primary-button" href="#contest">See today&apos;s fixture <span aria-hidden="true">↓</span></a>
    </section>
  </Reveal>;
}
