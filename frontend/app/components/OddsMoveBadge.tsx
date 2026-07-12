"use client";

import { useState } from "react";

type MatchOdds = {
  part1Win: number;
  draw: number;
  part2Win: number;
  snapshotTs: string;
};

type OddsMoveBadgeProps = {
  oddsBefore: MatchOdds | null;
  oddsAfter: MatchOdds | null;
  isStale?: boolean;
};

const fmt = (n: number) => n.toFixed(2);

export function OddsMoveBadge({ oddsBefore, oddsAfter, isStale }: OddsMoveBadgeProps) {
  const [open, setOpen] = useState(false);

  if (!oddsBefore && !oddsAfter) return null;

  let toneClass = "odds-move-flat";
  let arrow = "→";
  let pillText: string;
  if (oddsBefore && oddsAfter) {
    const delta = oddsAfter.part1Win - oddsBefore.part1Win;
    if (delta < -0.01) {
      toneClass = "odds-move-shortened";
      arrow = "↓";
    } else if (delta > 0.01) {
      toneClass = "odds-move-lengthened";
      arrow = "↑";
    }
    pillText = `${fmt(oddsBefore.part1Win)} ${arrow} ${fmt(oddsAfter.part1Win)}`;
  } else if (oddsAfter) {
    pillText = `Odds ${fmt(oddsAfter.part1Win)}`;
  } else {
    pillText = `Pre-event odds ${fmt(oddsBefore!.part1Win)}`;
  }
  if (isStale) toneClass = "odds-move-stale";

  const ariaLabel = `Market odds before: ${oddsBefore ? fmt(oddsBefore.part1Win) : "unavailable"}, after: ${oddsAfter ? fmt(oddsAfter.part1Win) : "unavailable"}`;

  return (
    <span className="receipt">
      <button
        type="button"
        className={`odds-move-pill ${toneClass}`}
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
      >
        {pillText}
      </button>
      {open && (
        <span className="receipt-detail" role="note">
          <span>
            <b>Market</b>
            <em>Full match 1X2 · TxLINE stable price</em>
          </span>
          {oddsBefore && (
            <>
              <span>
                <b>Before — team 1</b>
                <em>{fmt(oddsBefore.part1Win)}</em>
              </span>
              <span>
                <b>Before — draw</b>
                <em>{fmt(oddsBefore.draw)}</em>
              </span>
              <span>
                <b>Before — team 2</b>
                <em>{fmt(oddsBefore.part2Win)}</em>
              </span>
            </>
          )}
          {oddsAfter && (
            <>
              <span>
                <b>After — team 1</b>
                <em>{fmt(oddsAfter.part1Win)}</em>
              </span>
              <span>
                <b>After — draw</b>
                <em>{fmt(oddsAfter.draw)}</em>
              </span>
              <span>
                <b>After — team 2</b>
                <em>{fmt(oddsAfter.part2Win)}</em>
              </span>
            </>
          )}
          {isStale && (
            <span>
              <b>Note</b>
              <em>Odds data was delayed at event time</em>
            </span>
          )}
          {!isStale && (!oddsBefore || !oddsAfter) && (
            <span>
              <b>Note</b>
              <em>Partial snapshot — one bracket unavailable</em>
            </span>
          )}
          <span>
            <b>Scope</b>
            <em>Display only · never affects points or payout</em>
          </span>
        </span>
      )}
    </span>
  );
}
