import React, { useState } from "react";
import {
  Minus,
  Plus,
  RotateCcw,
  Zap,
  ArrowUp,
  ArrowDown,
  Shuffle,
  ShieldCheck,
} from "lucide-react";
import "./quick-controls.css";
const stats = [
  ["at", "ATK"],
  ["df", "DEF"],
  ["sa", "SPA"],
  ["sd", "SPD"],
  ["sp", "SPE"],
];
const chance = (n) => `${Math.round((n || 0) * 100)}%`;
export function Stepper({ label, value, onChange, min = -6, max = 6 }) {
  return (
    <label className="stepper">
      <span>{label.replace(/^.* (ATK|DEF|SPA|SPD|SPE) stage$/, "$1")}</span>
      <div>
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus size={12} />
        </button>
        <output
          className={value > 0 ? "positive" : value < 0 ? "negative" : ""}
        >
          {value > 0 ? "+" : ""}
          {value}
        </output>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus size={12} />
        </button>
      </div>
    </label>
  );
}
export function QuickSet({
  value,
  onChange,
  title = "Quick controls",
  effective,
}) {
  const update = (key, v) => onChange({ ...value, [key]: v });
  const conditional = [
    "Flash Fire",
    "Plus",
    "Minus",
    "Trace",
    "Stakeout",
    "Sand Spit",
    "Battle Bond",
    "Electromorphosis",
    "Wind Power",
    "Seed Sower",
    "Protean",
    "Libero",
  ].includes(value.ability);
  return (
    <div className="quick-set">
      <div className="quick-set-title">
        <strong>{title}</strong>
        <small>
          {effective
            ? `${effective.name} · ${effective.ability}`
            : value.species}
        </small>
        <button
          className="text-button"
          onClick={() => onChange({ ...value, boosts: {}, hpPercent: 100 })}
        >
          <RotateCcw size={12} />
          Reset stages & HP
        </button>
      </div>
      <div className="stage-controls">
        {stats.map(([k, label]) => (
          <Stepper
            key={k}
            label={`${value.species} ${label} stage`}
            value={value.boosts?.[k] || 0}
            onChange={(v) => update("boosts", { ...value.boosts, [k]: v })}
          />
        ))}
        <label className="quick-hp">
          HP
          <input
            aria-label={`${value.species} current HP percent`}
            type="number"
            min="1"
            max="100"
            value={value.hpPercent ?? 100}
            onChange={(e) =>
              update(
                "hpPercent",
                Math.max(1, Math.min(100, Number(e.target.value))),
              )
            }
          />
          %
        </label>
      </div>
      <div className="quick-toggles">
        <button
          className={value.mega !== false ? "on" : ""}
          onClick={() => update("mega", value.mega === false)}
        >
          <Zap size={12} />
          Mega auto {value.mega !== false ? "on" : "off"}
        </button>
        {(conditional ||
          [
            "Intimidate",
            "Slow Start",
            "Protosynthesis",
            "Quark Drive",
            "Unburden",
          ].includes(value.ability)) && (
          <button
            className={(value.abilityOn ?? !conditional) ? "on" : ""}
            onClick={() =>
              update("abilityOn", !(value.abilityOn ?? !conditional))
            }
          >
            <ShieldCheck size={12} />
            {value.ability || "Ability"}{" "}
            {(value.abilityOn ?? !conditional) ? "on" : "off"}
          </button>
        )}
        {effective && (
          <span className="effective-stages">
            Applied:{" "}
            {stats
              .filter(([k]) => effective.boosts?.[k])
              .map(
                ([k, label]) =>
                  `${label} ${effective.boosts[k] > 0 ? "+" : ""}${effective.boosts[k]}`,
              )
              .join(" · ") || "neutral stages"}
          </span>
        )}
      </div>
      <div className="quick-hint">
        Buttons set manual stages. Automatic ability and item changes are added
        once per calculation.
      </div>
    </div>
  );
}
export function QuickField({ options, onChange }) {
  const set = (key, value) => onChange({ ...options, [key]: value });
  const side = (key) =>
    onChange({
      ...options,
      [key]: { ...options[key], tailwind: !options[key]?.tailwind },
    });
  return (
    <div className="quick-field">
      <div className="field-pills">
        <span>Weather</span>
        {[
          ["Auto", "Auto"],
          ["", "None"],
          ["Sun", "Sun"],
          ["Rain", "Rain"],
          ["Sand", "Sand"],
          ["Snow", "Snow"],
        ].map(([v, n]) => (
          <button
            className={options.weather === v ? "on" : ""}
            key={v}
            onClick={() => set("weather", v)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="field-pills">
        <span>Terrain</span>
        {[
          ["Auto", "Auto"],
          ["", "None"],
          ["Grassy", "Grass"],
          ["Psychic", "Psychic"],
          ["Electric", "Electric"],
          ["Misty", "Misty"],
        ].map(([v, n]) => (
          <button
            className={options.terrain === v ? "on" : ""}
            key={v}
            onClick={() => set("terrain", v)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="field-pills battle-toggles">
        <button
          className={options.trickRoom ? "on trick-room" : ""}
          onClick={() => set("trickRoom", !options.trickRoom)}
        >
          <Shuffle size={13} />
          Trick Room {options.trickRoom ? "on" : "off"}
        </button>
        <button
          className={options.autoIntimidate !== false ? "on" : ""}
          onClick={() =>
            set("autoIntimidate", options.autoIntimidate === false)
          }
        >
          Auto Intimidate {options.autoIntimidate !== false ? "on" : "off"}
        </button>
        <button
          className={options.team?.tailwind ? "on" : ""}
          onClick={() => side("team")}
        >
          Your Tailwind
        </button>
        <button
          className={options.opponent?.tailwind ? "on" : ""}
          onClick={() => side("opponent")}
        >
          Foe Tailwind
        </button>
      </div>
    </div>
  );
}
export function PaceBadge({ cell }) {
  const p = cell.pace;
  if (!p) return null;
  const first =
    p.team > 0.999
      ? "You first"
      : p.opponent > 0.999
        ? "Foe first"
        : p.tie > 0.999
          ? "Order tie"
          : p.unknown > 0.001
            ? "Order ?"
            : p.blocked > 0.001
              ? "Priority blocked"
              : `${chance(p.team)} first`;
  const speed =
    p.faster > 0.999
      ? "Faster"
      : p.slower > 0.999
        ? "Slower"
        : p.speedTie > 0.999
          ? "Speed tie"
          : "Speed varies";
  return (
    <span
      className="pace-badges"
      title={`${cell.out?.move || "Your move"} vs ${cell.incoming?.move || "opponent move"}: you first ${chance(p.team)}, opponent first ${chance(p.opponent)}, ties ${chance(p.tie)}. Unknown ${chance(p.unknown)}, blocked ${chance(p.blocked)}. Speed: faster in ${chance(p.faster)} of modeled spreads. Priority is resolved before Trick Room / speed.`}
    >
      <span
        className={
          p.faster > 0.999 ? "ahead" : p.slower > 0.999 ? "behind" : ""
        }
      >
        {p.faster > 0.999 ? (
          <ArrowUp size={9} />
        ) : p.slower > 0.999 ? (
          <ArrowDown size={9} />
        ) : (
          <Shuffle size={9} />
        )}{" "}
        {speed}
      </span>
      <span
        className={
          p.team > 0.999 ? "ahead" : p.opponent > 0.999 ? "behind" : ""
        }
      >
        <Zap size={9} />
        {first}
      </span>
    </span>
  );
}
export function InitiativePanel({ calc, trickRoom }) {
  const [own, setOwn] = useState(""),
    [foe, setFoe] = useState("");
  const ownMove =
    calc.outgoing.find((m) => m.move === own) ||
    calc.outgoing.find((m) => !m.support) ||
    calc.outgoing[0];
  const foeMove =
    calc.incoming.find((m) => m.move === foe) ||
    calc.incoming.find((m) => !m.support) ||
    calc.incoming[0];
  const order = calc.orders.find(
    (o) => o.teamMove === ownMove.move && o.opponentMove === foeMove.move,
  );
  return (
    <div className="initiative">
      <div className="initiative-title">
        <Zap size={18} />
        <strong>Who acts first?</strong>
        {trickRoom && <span className="tag">Trick Room active</span>}
      </div>
      <div className="initiative-grid">
        <div>
          <small>YOUR EFFECTIVE SPEED</small>
          <strong>{calc.teamStats.sp}</strong>
          <label>
            <select
              aria-label="Your move for turn order"
              value={ownMove.move}
              onChange={(e) => setOwn(e.target.value)}
            >
              {calc.outgoing.map((m) => (
                <option key={m.move} value={m.move}>
                  {m.move} · priority {m.priority > 0 ? "+" : ""}
                  {m.priority ?? "?"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className={
            "order-result " +
            (order?.first === "team"
              ? "ahead"
              : order?.first === "opponent"
                ? "behind"
                : "")
          }
        >
          <span>
            {order?.speed === "team"
              ? "↑ You are faster"
              : order?.speed === "opponent"
                ? "↓ Opponent is faster"
                : "↔ Speed tie"}
          </span>
          <strong>
            {order?.first === "team"
              ? "You act first"
              : order?.first === "opponent"
                ? "Opponent acts first"
                : order?.first === "tie"
                  ? "50 / 50 order"
                  : order?.first === "blocked"
                    ? "Priority blocked"
                    : "Order uncertain"}
          </strong>
          <small>{order?.reason}</small>
        </div>
        <div>
          <small>OPPONENT EFFECTIVE SPEED</small>
          <strong>{calc.opponentStats.sp}</strong>
          <label>
            <select
              aria-label="Opponent move for turn order"
              value={foeMove.move}
              onChange={(e) => setFoe(e.target.value)}
            >
              {calc.incoming.map((m) => (
                <option key={m.move} value={m.move}>
                  {m.move} · priority {m.priority > 0 ? "+" : ""}
                  {m.priority ?? "?"}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <p>
        Higher priority goes first. Trick Room reverses speed order within the
        same priority bracket. Order assumes the selected actions are usable; it
        does not predict switches, flinches or whether a first hit prevents the
        reply.
      </p>
    </div>
  );
}
