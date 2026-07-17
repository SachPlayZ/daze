const rows = [
  { label: "Forwards", slots: ["FWD", "FWD", "FWD"] },
  { label: "Midfielders", slots: ["MID", "MID", "MID"] },
  { label: "Defenders", slots: ["DEF", "DEF", "DEF", "DEF"] },
  { label: "Goalkeeper", slots: ["GK"] },
];

export function LandingFormation() {
  return (
    <figure className="landing-formation">
      <figcaption>
        <span>4-3-3 formation</span>
        <strong>Eleven verified places</strong>
      </figcaption>
      <div
        className="landing-formation-pitch"
        role="img"
        aria-label="Example 4-3-3 formation with three forwards, three midfielders, four defenders, and one goalkeeper"
      >
        {rows.map((row) => (
          <div className="landing-formation-row" key={row.label} aria-hidden="true">
            {row.slots.map((slot, index) => (
              <span className="landing-formation-slot" key={`${row.label}-${index}`}>
                {slot}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p>Position map only. Real names appear when TxLINE lineups are ready.</p>
    </figure>
  );
}
