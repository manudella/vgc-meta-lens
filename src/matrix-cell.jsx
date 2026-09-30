import React from "react";
import { PaceBadge } from "./quick-controls.jsx";
const pct = (n) => (n == null ? "—" : `${Number((n * 100).toFixed(1))}%`);
const range = (m) =>
  m ? `${m.minPercent.toFixed(1)}–${m.maxPercent.toFixed(1)}%` : "—";
const tone = (n) =>
  n == null ? "unknown" : n >= 0.95 ? "good" : n >= 0.5 ? "mixed" : "bad";
export function MatrixCell({ cell: c, mode, own, foe, expanded, onClick }) {
  const both = mode === "both",
    chance = mode === "incoming" ? c.survive : c.ko,
    damage = mode === "incoming" ? c.incoming : c.out;
  const p = c.pace || {};
  return (
    <button
      className={both ? "calc-cell split-cell" : `calc-cell ${tone(chance)}`}
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={`${own} vs ${foe}: dealt ${range(c.out)}, received ${range(c.incoming)}. Open matchup.`}
      title={`${c.out?.move || "No damage"}: ${pct(c.ko)} OHKO; ${c.incoming?.move || "No damage"}: ${pct(c.survive)} survival. Speed: ${c.speedRange ? `you ${c.speedRange.team.join("–")}, foe ${c.speedRange.opponent.join("–")}` : "unavailable"}. Brighter triangle = faster across every modeled spread. Priority can change move order.`}
    >
      {both ? (
        <>
          <span
            className={`split-bg dealt ${tone(c.ko)} ${p.faster > 0.999 ? "faster" : ""}`}
          />
          <span
            className={`split-bg received ${tone(c.survive)} ${p.slower > 0.999 ? "faster" : ""}`}
          />
          <span className="split-out">
            <small>↗ DEALT {p.faster > 0.999 ? "⚡" : ""}</small>
            <strong>{range(c.out)}</strong>
            <small>{pct(c.ko)} OHKO</small>
          </span>
          <span className="split-in">
            <small>↙ RECEIVED {p.slower > 0.999 ? "⚡" : ""}</small>
            <strong>{range(c.incoming)}</strong>
            <small>{pct(c.survive)} survive</small>
          </span>
          <span className="split-speed">
            {p.faster > 0.999
              ? "You faster"
              : p.slower > 0.999
                ? "Foe faster"
                : p.speedTie > 0.999
                  ? "Speed tie"
                  : "Speed varies"}
          </span>
        </>
      ) : (
        <>
          <strong className="cell-damage">{range(damage)}</strong>
          <small>{damage?.move || "No damaging move"}</small>
          <span className="cell-probability">
            {pct(chance)} {mode === "outgoing" ? "OHKO" : "survive"}
          </span>
          <span className="cell-meter">
            <i style={{ width: `${(chance || 0) * 100}%` }} />
          </span>
          <PaceBadge cell={c} />
        </>
      )}
    </button>
  );
}
