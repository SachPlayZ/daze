"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "daze-onboarding-seen";

export function OnboardingSheet() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Must run post-hydration only: localStorage is unavailable during SSR, so this
    // can't be a lazy useState initializer without a server/client markup mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);
  function dismiss() { localStorage.setItem(STORAGE_KEY, "1"); setOpen(false); }
  return <>
    <button className="nav-link" onClick={() => setOpen(true)}>How it works</button>
    {open && <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" onClick={dismiss}>
      <div className="onboarding-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="eyebrow">30-second guide</div>
        <h2 id="onboarding-title">Build your XI, feel every moment</h2>
        <ol className="onboarding-steps">
          <li><strong>Pick a formation.</strong> Choose how your 11 players line up on the pitch.</li>
          <li><strong>Build your XI.</strong> Quick Pick builds a valid team instantly, or build manually by tapping each player yourself.</li>
          <li><strong>Choose captain &amp; vice.</strong> Your captain scores double points. Your vice-captain only steps in if the captain never takes the pitch.</li>
          <li><strong>Lock in &amp; follow live.</strong> Once locked, every verified match action updates your points and rank in real time.</li>
        </ol>
        <button className="primary-button" onClick={dismiss}>Got it <span aria-hidden="true">→</span></button>
      </div>
    </div>}
  </>;
}
