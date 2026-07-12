import { Reveal } from "./Reveal";

const markers = [
  { label: "Provider timestamp", detail: "Exact source event time, never the client clock." },
  { label: "Content hash", detail: "A fingerprint of the verified event payload." },
  { label: "Proof status", detail: "Provisional → reconciled → settled on Solana devnet." },
];

export function ProofBand() {
  return <Reveal className="proof-band">
    <section aria-labelledby="proof-title" className="proof-band-inner">
      <div className="proof-band-copy">
        <div className="eyebrow">Verified, not vibes</div>
        <h2 id="proof-title">Every point has a receipt.</h2>
        <p>No fabricated events, no estimated scores. Each action ties to a provider timestamp, a content hash, and a proof status. Tap any receipt to see it.</p>
      </div>
      <ul className="proof-markers">
        {markers.map((marker) => <li key={marker.label} className="proof-marker"><span className="eyebrow">{marker.label}</span><p>{marker.detail}</p></li>)}
      </ul>
    </section>
  </Reveal>;
}
