import React from "react";
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
import { displayedStage, resetBattleState } from "../shared/battle-state.mjs";
import { PokemonSprite } from "./pokemon-sprite.jsx";
const stats = [
  ["at", "ATK"],
  ["df", "DEF"],
  ["sa", "SPA"],
  ["sd", "SPD"],
  ["sp", "SPE"],
];
const chance = (n) => `${Math.round((n || 0) * 100)}%`;
export function Stepper({ label, value, onChange, min = -6, max = 6, note }) {
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
      {note && <small className="stage-note">{note}</small>}
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
        <PokemonSprite name={effective?.name || value.species} small />
        <strong>{title}</strong>
        <small>
          {effective
            ? `${effective.name} · ${effective.ability}`
            : value.species}
        </small>
        <button
          className="text-button"
          onClick={() => onChange(resetBattleState(value))}
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
            value={displayedStage(value, effective, k)}
            note={
              value.stageOverrides?.[k] != null
                ? `Override${effective ? ` · auto ${effective.automaticBoosts?.[k] ?? 0}` : ""}`
                : effective?.boosts?.[k] !== undefined &&
                    effective.boosts[k] !== (value.boosts?.[k] || 0)
                  ? "Automatic"
                  : ""
            }
            onChange={(v) =>
              update("stageOverrides", { ...value.stageOverrides, [k]: v })
            }
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
        {effective
          ? "Stages shown are the final values used in this matchup, including automatic abilities and items."
          : "Automatic stages vary by opponent; open a matchup to see its final values."}{" "}
        ± sets a final-stage override. Reset restores automatic stages and full
        HP.
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
          className={options.autoMoveConditions !== false ? "on" : ""}
          onClick={() =>
            set("autoMoveConditions", options.autoMoveConditions === false)
          }
          title="With Auto terrain and no terrain-setting ability, assume the terrain needed by Expanding Force, Rising Voltage, Grassy Glide or Misty Explosion. Choose a terrain explicitly to override."
        >
          Move terrain {options.autoMoveConditions !== false ? "auto" : "off"}
        </button>
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
