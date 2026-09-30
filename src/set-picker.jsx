import React, { useState } from "react";
const keys = ["hp", "at", "df", "sa", "sd", "sp"],
  names = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];
export const spreadLabel = (set) =>
  keys
    .flatMap((k, i) => (set.sp?.[k] ? [`${set.sp[k]} ${names[i]}`] : []))
    .join(" / ") || "0 SP";
export function SetPicker({ threat, opponent, onSelect }) {
  const [query, setQuery] = useState("");
  const kind = opponent.kind === "published" ? "published" : "estimated";
  const sets = threat.sets.filter(
    (s) =>
      s.kind === kind &&
      (kind !== "published" ||
        (s.label + s.nature + s.item)
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const pickKind = (next) => {
    setQuery("");
    const first = threat.sets.find((s) => s.kind === next);
    if (first) onSelect(structuredClone(first));
  };
  return (
    <div className="set-picker">
      <div className="segmented">
        <button
          className={kind === "estimated" ? "active" : ""}
          onClick={() => pickKind("estimated")}
        >
          In-game distributions
        </button>
        <button
          className={kind === "published" ? "active" : ""}
          disabled={!threat.sets.some((s) => s.kind === "published")}
          onClick={() => pickKind("published")}
        >
          Published sets (
          {threat.sets.filter((s) => s.kind === "published").length})
        </button>
      </div>
      <div className="set-picker-controls">
        {kind === "published" && (
          <input
            aria-label="Find published set"
            placeholder="Find player, item or nature…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        <label className="field-label">
          {kind === "estimated"
            ? "Stat-point allocation · reported usage"
            : "Published team and spread"}
          <select
            aria-label="Opponent set"
            value={opponent.id || ""}
            onChange={(e) =>
              onSelect({
                ...structuredClone(
                  threat.sets.find((s) => s.id === e.target.value),
                ),
                ...(kind === "estimated" ? { nature: opponent.nature } : {}),
              })
            }
          >
            {!sets.some((s) => s.id === opponent.id) && (
              <option value={opponent.id}>
                {opponent.label} · {spreadLabel(opponent)}
              </option>
            )}
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {kind === "estimated"
                  ? `${spreadLabel(s)} · ${s.weight}%`
                  : `${s.label} · ${s.nature} · ${spreadLabel(s)}`}
              </option>
            ))}
          </select>
        </label>
        {kind === "estimated" && (
          <label className="field-label">
            Nature · independent distribution
            <select
              aria-label="Estimated nature"
              value={opponent.nature}
              onChange={(e) =>
                onSelect({ ...opponent, nature: e.target.value })
              }
            >
              {threat.distributions.natures.map(([name, use]) => (
                <option key={name} value={name}>
                  {name} · {use}%
                </option>
              ))}
            </select>
          </label>
        )}
        <a href={opponent.source} target="_blank" rel="noreferrer">
          View source ↗
        </a>
      </div>
      <p className="tiny-note">
        {kind === "estimated"
          ? "Spread and nature frequencies are separate. The default uses the most common nature, item, ability and moves; changing nature tests a scenario, not an observed full set."
          : "Actual published nature, item, ability, moves and stat points. Champions points labeled EVs in a paste are kept as points."}
      </p>
    </div>
  );
}
