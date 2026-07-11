"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => typeof window !== "undefined" && localStorage.getItem("daze-theme") === "dark");
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  function toggle() { const next = !dark; setDark(next); document.documentElement.dataset.theme = next ? "dark" : "light"; localStorage.setItem("daze-theme", next ? "dark" : "light"); }
  return <button aria-label={`Switch to ${dark ? "light" : "dark"} theme`} className="icon-button" onClick={toggle}>{dark ? "☀" : "◐"}</button>;
}
