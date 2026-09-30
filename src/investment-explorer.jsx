import React, { useEffect, useState } from "react";
const labels = {
  hp: "HP",
  at: "Atk",
  df: "Def",
  sa: "SpA",
  sd: "SpD",
  sp: "Spe",
};
const pct = (x) => (x == null ? "Unknown" : `${Number((x * 100).toFixed(1))}%`);
export function InvestmentExplorer({
  team,
  opponent,
  options,
  direction,
  move,
  onApply,
}) {
  const [target, setTarget] = useState(1),
    [result, setResult] = useState(null),
    [picked, setPicked] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setResult(null);
    setPicked(null);
    setError("");
    if (!move || move.support) {
      setBusy(false);
      return;
    }
    const c = new AbortController();
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/investment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team,
            opponent,
            options,
            direction,
            move: move.move,
            threshold: target,
          }),
          signal: c.signal,
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setResult(d);
        setPicked(d.minimum);
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        if (!c.signal.aborted) setBusy(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [team, opponent, options, direction, move?.move, move?.support, target]);
  return (
    <section className="optimizer investment-explorer">
      <div className="optimizer-heading">
        <div>
          <span className="eyebrow">STAT-POINT TARGETS</span>
          <h4>
            {direction === "incoming"
              ? "Survive this move."
              : "KO with this move."}
          </h4>
        </div>
        <label className="field-label">
          Target probability
          <select
            aria-label="Investment target probability"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          >
            {[
              [1, "100%"],
              [0.9375, "93.75%"],
              [0.875, "87.5%"],
              [0.75, "75%"],
              [0.5, "50%"],
            ].map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        {move?.move || "Select a move"} ·{" "}
        {direction === "incoming"
          ? "Automatically compares HP + the relevant defensive stat."
          : "Automatically scans the relevant attacking stat."}{" "}
        {busy && "Calculating…"}
      </p>
      {move?.support && (
        <p>Select a damaging move above to find an investment.</p>
      )}
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <div className="investment-plot-label">
            {result.axes.length === 2
              ? `Rows: HP 0–32 · Columns: ${labels[result.axes[0]]} 0–32`
              : `${labels[result.axes[0]]} investment: 0–32 SP`}{" "}
            · green meets your target · click to preview
          </div>
          <div
            className={
              result.axes.length === 2
                ? "investment-heatmap"
                : "investment-line"
            }
            aria-label="Investment probability map"
          >
            {result.points.map((p) => (
              <button
                key={`${p.x}-${p.y}`}
                className={p.chance >= target ? "meets" : "misses"}
                style={
                  result.axes.length === 2
                    ? {
                        gridColumn: p.x + 1,
                        gridRow: p.y + 1,
                        opacity: 0.35 + 0.65 * (p.chance ?? 0),
                      }
                    : { height: `${Math.max(8, (p.chance || 0) * 80)}px` }
                }
                title={`${p.x} ${labels[result.axes[0]]}${result.axes.length === 2 ? ` + ${p.y} HP` : ""}: ${pct(p.chance)} · ${p.min.toFixed(1)}–${p.max.toFixed(1)}% damage`}
                aria-label={`${p.x} ${labels[result.axes[0]]}${result.axes.length === 2 ? ` ${p.y} HP` : ""}: ${pct(p.chance)}`}
                onClick={() => setPicked(p)}
              />
            ))}
          </div>
          {!result.minimum && (
            <p className="warning-note">
              No allocation reaches {pct(target)} with this set, nature and
              battle state.
            </p>
          )}
          {result.alternatives.length > 1 && (
            <div className="investment-alternatives">
              Minimum-cost options:{" "}
              {result.alternatives.map((p) => (
                <button key={`${p.x}-${p.y}`} onClick={() => setPicked(p)}>
                  {p.y} HP / {p.x} {labels[result.axes[0]]}
                </button>
              ))}
            </div>
          )}
          {picked && (
            <div className="breakpoint">
              <span>
                <strong>
                  {picked.cost} target-stat points · {pct(picked.chance)}{" "}
                  {direction === "incoming" ? "survival" : "KO"}
                </strong>
                <br />
                {Object.entries(labels)
                  .map(([k, n]) => `${picked.sp[k] || 0} ${n}`)
                  .join(" / ")}
                <br />
                <small>
                  {picked.min.toFixed(1)}–{picked.max.toFixed(1)}% damage
                  {picked.reallocated
                    ? ` · ${picked.reallocated} points reallocated from other stats`
                    : ""}
                </small>
              </span>
              <button
                className="secondary"
                onClick={() => onApply({ ...team, sp: picked.sp })}
              >
                Apply this spread
              </button>
            </div>
          )}
          <p className="tiny-note">{result.note}</p>
        </>
      )}
    </section>
  );
}
