import React from "react";
import { PaceBadge } from "./quick-controls.jsx";
import { damageTone, damageBar } from "../shared/damage-display.mjs";
const pct = (n) => (n == null ? "—" : `${Number((n * 100).toFixed(1))}%`);
const range = (m) =>
  m ? `${m.minPercent.toFixed(1)}–${m.maxPercent.toFixed(1)}%` : "—";
function DamageBar({ damage }) {
  const bar = damageBar(damage);
  return (
    <span
      className="damage-meter"
      role="img"
      aria-label={`Damage range ${range(damage)}; bar scale 0 to 100% HP`}
    >
      <i className="damage-min" style={{ width: `${bar.min}%` }} />
      <i
        className="damage-range"
        style={{ left: `${bar.min}%`, width: `${bar.range}%` }}
      />
      <i className="damage-tick fifty" />
      <i className="damage-tick eighty" />
      {bar.overflow && <b className="damage-overflow">›</b>}
    </span>
  );
}
function KoLabel({ ko, fallback }) {
  return ko > 0.5 ? (
    <small className="ko-alert">✹ KO {pct(ko)}</small>
  ) : (
    <small>{fallback}</small>
  );
}
export function MatrixCell({ cell: c, mode, own, foe, expanded, onClick }) {
  const both = mode === "both",
    incoming = mode === "incoming",
    p = c.pace || {};
  const receivedKo = c.survive == null ? null : 1 - c.survive;
  const damage = incoming ? c.incoming : c.out,
    ko = incoming ? receivedKo : c.ko;
  return (
    <button
      className={
        both
          ? "calc-cell split-cell"
          : `calc-cell damage-tone ${damageTone(damage, ko)}`
      }
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={`${own} vs ${foe}: dealt ${range(c.out)}, received ${range(c.incoming)}. Open matchup.`}
      title={`${c.out?.move || "No damage"}: ${pct(c.ko)} OHKO; ${c.incoming?.move || "No damage"}: ${pct(receivedKo)} incoming OHKO. Bars: minimum to maximum damage, capped at 100% HP. Color: maximum damage. Brighter half = faster; priority can change order.`}
    >
      {both ? (
        <>
          <span
            className={`split-bg dealt ${damageTone(c.out, c.ko)} ${p.faster > 0.999 ? "faster" : ""}`}
          />
          <span
            className={`split-bg received ${damageTone(c.incoming, receivedKo)} ${p.slower > 0.999 ? "faster" : ""}`}
          />
          <span className="split-out">
            <small>↗ DEALT {p.faster > 0.999 ? "⚡" : ""}</small>
            <strong>{range(c.out)}</strong>
            <DamageBar damage={c.out} />
            <KoLabel ko={c.ko} fallback={`${pct(c.ko)} OHKO`} />
          </span>
          <span className="split-in">
            <small>↙ RECEIVED {p.slower > 0.999 ? "⚡" : ""}</small>
            <strong>{range(c.incoming)}</strong>
            <DamageBar damage={c.incoming} />
            <KoLabel ko={receivedKo} fallback={`${pct(c.survive)} survive`} />
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
          <KoLabel
            ko={ko}
            fallback={`${pct(incoming ? c.survive : c.ko)} ${incoming ? "survive" : "OHKO"}`}
          />
          <DamageBar damage={damage} />
          <PaceBadge cell={c} />
        </>
      )}
    </button>
  );
}
