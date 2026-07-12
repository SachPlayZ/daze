"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  // Must run post-hydration only: localStorage is unavailable during SSR, so this
  // can't be a lazy useState initializer without a server/client markup mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDark(localStorage.getItem("daze-theme") === "dark"); }, []);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  function toggle() { const next = !dark; setDark(next); document.documentElement.dataset.theme = next ? "dark" : "light"; localStorage.setItem("daze-theme", next ? "dark" : "light"); }
  return <button aria-label={`Switch to ${dark ? "light" : "dark"} theme`} className="icon-button" onClick={toggle}>{dark ? "☀" : "◐"}</button>;
}
