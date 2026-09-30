import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  Plus,
  X,
  SlidersHorizontal,
  Layers3,
  BookOpen,
  Database,
  Check,
  Download,
  ExternalLink,
  Target,
  Shield,
  Activity,
  Info,
  Settings2,
} from "lucide-react";
import "./style.css";
import "./matrix.css";
import { PokemonSprite } from "./pokemon-sprite.jsx";
import { displaySpecies } from "../shared/sprites.mjs";
import { SetPicker } from "./set-picker.jsx";
import { MatrixCell } from "./matrix-cell.jsx";
import { InvestmentExplorer } from "./investment-explorer.jsx";
import { LATEST_METAGAME, metagameEvents } from "../shared/metagames.mjs";
import { displayedStage } from "../shared/battle-state.mjs";
import { QuickSet, QuickField, PaceBadge, Stepper } from "./quick-controls.jsx";

const keys = ["hp", "at", "df", "sa", "sd", "sp"],
  labels = ["HP", "ATK", "DEF", "SPA", "SPD", "SPE"];
const example = [
  {
    species: "Rillaboom",
    item: "Miracle Seed",
    ability: "Grassy Surge",
    nature: "Adamant",
    sp: { hp: 32, at: 32, df: 0, sa: 0, sd: 0, sp: 2 },
    moves: ["Fake Out", "Grassy Glide", "Wood Hammer", "High Horsepower"],
  },
  {
    species: "Incineroar",
    item: "Sitrus Berry",
    ability: "Intimidate",
    nature: "Careful",
    sp: { hp: 32, at: 2, df: 12, sa: 0, sd: 20, sp: 0 },
    moves: ["Fake Out", "Flare Blitz", "Knock Off", "Parting Shot"],
  },
  {
    species: "Salamence",
    item: "Salamencite",
    ability: "Intimidate",
    nature: "Jolly",
    sp: { hp: 2, at: 32, df: 0, sa: 0, sd: 0, sp: 32 },
    moves: ["Double-Edge", "Dragon Claw", "Earthquake", "Protect"],
  },
  {
    species: "Gholdengo",
    item: "Life Orb",
    ability: "Good as Gold",
    nature: "Modest",
    sp: { hp: 2, at: 0, df: 0, sa: 32, sd: 0, sp: 32 },
    moves: ["Make It Rain", "Shadow Ball", "Nasty Plot", "Protect"],
  },
];
function stored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}
async function api(path, body, signal) {
  const r = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}
const pct = (x) =>
  x == null ? "—" : `${(x * 100).toFixed(x === 0 || x === 1 ? 0 : 1)}%`;
const num = (x) => Number(x).toFixed(1);
function Avatar({ name, small = false }) {
  return <PokemonSprite name={name} small={small} />;
}
function FieldSelect({ label, value, onChange, values }) {
  return (
    <label className="field-label">
      {label}
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {values.map((v) => (
          <option key={v} value={v}>
            {v || "None"}
          </option>
        ))}
      </select>
    </label>
  );
}
function App() {
  const [team, setTeam] = useState(() => stored("meta-lens-team", example)),
    [teamSource, setTeamSource] = useState(() =>
      stored(
        "meta-lens-team-source",
        stored("meta-lens-team", null) ? "Saved team" : "Example core",
      ),
    ),
    [opponentTeam, setOpponentTeam] = useState(() =>
      stored("meta-lens-opponent", []),
    ),
    [opponentSource, setOpponentSource] = useState(() =>
      stored("meta-lens-opponent-source", "Imported opponent"),
    ),
    [data, setData] = useState(null),
    [status, setStatus] = useState({ running: true, progress: "Connecting" }),
    [cat, setCat] = useState(null),
    [rows, setRows] = useState([]),
    [options, setOptions] = useState({
      weather: "Auto",
      terrain: "Auto",
      team: {},
      opponent: {},
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState("matchups"),
    [mode, setMode] = useState("both"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState(null),
    [member, setMember] = useState(0),
    [modal, setModal] = useState(null),
    [conditions, setConditions] = useState(false),
    [quickControls, setQuickControls] = useState(false),
    [quickCalc, setQuickCalc] = useState(null),
    [limit, setLimit] = useState(20),
    [gapsOnly, setGapsOnly] = useState(false),
    [sort, setSort] = useState("usage");
  const isVersus = tab === "versus";
  const isMatrix = tab === "matchups" || isVersus;
  useEffect(() => {
    localStorage.setItem("meta-lens-opponent", JSON.stringify(opponentTeam));
    localStorage.setItem(
      "meta-lens-opponent-source",
      JSON.stringify(opponentSource),
    );
  }, [opponentTeam, opponentSource]);
  useEffect(() => {
    let alive = true;
    api("catalog")
      .then((x) => alive && setCat(x))
      .catch((e) => setError(e.message));
    let last = "";
    const poll = async () => {
      try {
        const s = await api("state");
        if (!alive) return;
        setStatus(s);
        if (s.updatedAt && s.updatedAt !== last) {
          last = s.updatedAt;
          const d = await api("data");
          if (alive) {
            setData(d);
            setSelected(null);
          }
        }
      } catch (e) {
        if (alive) setError(e.message);
      }
    };
    poll();
    const id = setInterval(poll, 1800);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  useEffect(() => {
    localStorage.setItem("meta-lens-team", JSON.stringify(team));
    localStorage.setItem("meta-lens-team-source", JSON.stringify(teamSource));
  }, [team, teamSource]);
  useEffect(() => {
    if (isVersus ? !opponentTeam.length : !data) {
      setRows([]);
      setBusy(false);
      return;
    }
    const c = new AbortController();
    setBusy(true);
    const timer = setTimeout(
      () =>
        api(
          "analyze",
          {
            team,
            options,
            ...(isVersus ? { opponentTeam } : { view: { limit, query } }),
          },
          c.signal,
        )
          .then((r) => {
            setRows(r);
            setError("");
          })
          .catch((e) => {
            if (e.name !== "AbortError") {
              setError(e.message);
              setRows([]);
            }
          })
          .finally(() => {
            if (!c.signal.aborted) setBusy(false);
          }),
      200,
    );
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [team, data, options, limit, query, isVersus, opponentTeam]);
  useEffect(() => {
    setQuickCalc(null);
    const opponent = rows
      .find((t) => (t.id || t.species) === selected)
      ?.sets.find((s) => s.kind === "estimated" || s.kind === "exact");
    if (!quickControls || !opponent) return;
    const controller = new AbortController();
    api(
      "calculate",
      { team: team[member] || team[0], opponent, options },
      controller.signal,
    )
      .then(setQuickCalc)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [team, member, selected, options, quickControls, rows]);
  const visible = useMemo(
    () =>
      rows
        .filter((r) =>
          r.species.toLowerCase().includes(query.trim().toLowerCase()),
        )
        .filter(
          (r) =>
            !gapsOnly ||
            !r.cells.some(
              (c) => (mode === "incoming" ? c.survive : c.ko) >= 0.95,
            ),
        )
        .sort((a, b) =>
          sort === "risk"
            ? Math.max(...a.cells.map((c) => c.survive ?? 0)) -
              Math.max(...b.cells.map((c) => c.survive ?? 0))
            : (b.usage || 0) - (a.usage || 0) ||
              (a.rank || 999) - (b.rank || 999),
        ),
    [rows, query, sort, gapsOnly, mode],
  );
  const extraConditions = [
    options.singleTarget,
    options.critical,
    ...["team", "opponent"].flatMap((side) =>
      ["reflect", "lightScreen", "helpingHand", "friendGuard", "protect"].map(
        (key) => options[side]?.[key],
      ),
    ),
  ].filter(Boolean).length;
  const changeTeam = (t, source = "Imported team") => {
    setTeam(t);
    setTeamSource(source);
    setRows([]);
    setMember(0);
    setSelected(null);
    setModal(null);
  };
  const changeOpponent = (next, source = "Imported opponent") => {
    setOpponentTeam(next);
    setOpponentSource(source);
    setRows([]);
    setSelected(null);
    setModal(null);
    setTab("versus");
    setQuery("");
    setGapsOnly(false);
  };
  const navigate = (next) => {
    setTab(next);
    setSelected(null);
    setQuery("");
    setGapsOnly(false);
  };
  const refresh = async (config) => {
    try {
      await api("refresh", config || {});
      setStatus((s) => ({ ...s, running: true }));
    } catch (e) {
      setError(e.message);
    }
  };
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              team,
              opponentTeam: isVersus ? opponentTeam : undefined,
              options,
              dataset: {
                updatedAt: data?.updatedAt,
                format: data?.format,
                events: data?.selectedEvents,
              },
              analysis: rows,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    a.download = "meta-lens-analysis.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("matchups");
          }}
        >
          <span className="brand-mark">
            <Search size={23} />
          </span>
          <span>
            META LENS<small>VGC MATCHUP LAB</small>
          </span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {[
            ["matchups", Layers3, "Matchup matrix"],
            ["versus", Target, "Team vs team"],
            ["teams", BookOpen, "Published teams"],
            ["sources", Database, "Data & sources"],
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              className={tab === id ? "nav active" : "nav"}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              {label}
              {tab === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="online-dot" /> Local workspace
          <small>Nimbasa City Post calculation engine</small>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace <ChevronRight size={14} />{" "}
            <strong>
              {isVersus
                ? "Team vs team"
                : tab === "matchups"
                  ? "Matchup matrix"
                  : tab === "teams"
                    ? "Published teams"
                    : "Data & sources"}
            </strong>
          </div>
          <span className="format-badge">
            POKÉMON CHAMPIONS <span>{data?.format || LATEST_METAGAME}</span>
          </span>
        </header>
        <div className={"page " + (isMatrix ? "matrix-page" : "")}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                YOUR TEAM. THE METAGAME. EVERY ROLL.
              </div>
              <h1>
                {isVersus
                  ? "Your team × their team."
                  : tab === "matchups"
                    ? "Your team × the meta."
                    : tab === "teams"
                      ? "Learn from the field."
                      : "Trace every number."}
              </h1>
              <p>
                {tab === "matchups"
                  ? "Read the ranges. Find the gaps. Open any cell for the exact matchup."
                  : tab === "teams"
                    ? "Tournament teams and creator builds from the VGCPastes repository."
                    : "Tournament representation, in-game distributions, and published sets — with their sources attached."}
              </p>
            </div>
            <button
              className="secondary"
              onClick={() =>
                refresh(
                  data?.config || {
                    format: data?.format || LATEST_METAGAME,
                    eventIds: data?.selectedEvents?.map((e) => e.id),
                  },
                )
              }
              disabled={status.running}
            >
              <RefreshCw size={16} className={status.running ? "spin" : ""} />
              {status.running ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
          {(error || status.error) && (
            <div className="alert" role="alert">
              {error || status.error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          {status.running && (
            <div className="refresh-status">
              <span className="pulse" />
              {status.progress}
              <span>
                {status.total > 0
                  ? `${status.done} / ${status.total}`
                  : "Preparing data sources"}
              </span>
            </div>
          )}
          {isMatrix && (
            <>
              <section className="team-section">
                <div className="section-title">
                  <div>
                    <span className="step">01</span>
                    <h2>Your team</h2>
                    <span className="muted">
                      {team.length} / 6 Pokémon · {teamSource}
                    </span>
                  </div>
                  <div className="actions">
                    <button
                      className="text-button"
                      onClick={() => setModal({ type: "import" })}
                    >
                      <Plus size={16} />
                      Import team or core
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        changeTeam(structuredClone(example), "Example core")
                      }
                    >
                      Load example
                    </button>
                    <button
                      className="icon-button"
                      onClick={download}
                      title="Export team and analysis"
                      aria-label="Export analysis"
                    >
                      <Download size={17} />
                    </button>
                  </div>
                </div>
                <div className="team-strip">
                  {team.map((p, i) => (
                    <div
                      className={
                        "team-chip " + (member === i ? "selected" : "")
                      }
                      key={i}
                    >
                      <button
                        className="team-chip-select"
                        onClick={() => setMember(i)}
                        aria-pressed={member === i}
                      >
                        <Avatar
                          small
                          name={displaySpecies(p, cat?.megaItems)}
                          index={i}
                        />
                        <span>
                          <strong>{p.species}</strong>
                          <small>{p.item || "No held item"}</small>
                        </span>
                      </button>
                      <button
                        className="team-chip-edit"
                        onClick={() => setModal({ type: "edit", index: i })}
                        aria-label={`Edit ${p.species}`}
                        title={`Edit ${p.species}`}
                      >
                        <Settings2 size={14} />
                      </button>
                    </div>
                  ))}
                  {team.length < 6 && (
                    <button
                      className="add-chip"
                      onClick={() => setModal({ type: "import" })}
                    >
                      <Plus size={16} /> Add
                    </button>
                  )}
                </div>
              </section>
              {isVersus && (
                <section className="opponent-section">
                  <div className="section-title">
                    <div>
                      <h2>Opponent team</h2>
                      <span className="muted">
                        {opponentTeam.length} / 6 · {opponentSource}
                      </span>
                    </div>
                    <div className="actions">
                      <button
                        className="secondary"
                        onClick={() => setModal({ type: "opponent-import" })}
                      >
                        Import opponent team
                      </button>
                      <button
                        className="secondary"
                        onClick={() => setTab("teams")}
                      >
                        Choose published opponent
                      </button>
                    </div>
                  </div>
                  <div className="team-strip">
                    {opponentTeam.map((p, i) => (
                      <button
                        className="team-chip team-chip-select"
                        key={i}
                        onClick={() =>
                          setModal({ type: "opponent-edit", index: i })
                        }
                        aria-label={`Edit opponent ${p.species}`}
                      >
                        <PokemonSprite
                          small
                          name={displaySpecies(p, cat?.megaItems)}
                        />
                        <span>
                          <strong>{p.species}</strong>
                          <small>{p.item || "No item"}</small>
                        </span>
                        <Settings2 size={14} />
                      </button>
                    ))}
                  </div>
                  {opponentTeam.some((p) => p.spreadKnown === false) && (
                    <p className="warning-note">
                      Some opponent spreads were not published and currently use
                      0 SP. Edit them before relying on these calculations.
                    </p>
                  )}
                </section>
              )}
              <div className="source-strip">
                <span>
                  <strong>{data?.threats.length || "—"}</strong> meta Pokémon
                </span>
                <span>
                  <strong>{data?.teamCount?.toLocaleString() || "—"}</strong>{" "}
                  tournament teams
                </span>
                <span>
                  <strong>{data?.publishedLoaded || "—"}</strong> published
                  teams
                </span>
                <button onClick={() => setTab("sources")}>
                  Sources ·{" "}
                  {data
                    ? new Date(data.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    : "Loading"}{" "}
                  <ArrowUpRight size={12} />
                </button>
              </div>
              <section
                className="analysis-section"
                id="matchup-matrix"
                aria-label={
                  isVersus
                    ? "Team versus team matrix"
                    : "Team versus metagame matrix"
                }
              >
                <div className="section-title">
                  <div>
                    <span className="step">02</span>
                    <h2>Matchup matrix</h2>
                    {busy && <span className="calculating">Calculating…</span>}
                  </div>
                  <div className="actions">
                    <button
                      className={
                        "text-button " + (quickControls ? "active-text" : "")
                      }
                      onClick={() => setQuickControls(!quickControls)}
                      aria-expanded={quickControls}
                    >
                      <Settings2 size={16} /> Stats & field{" "}
                      <ChevronDown size={14} />
                    </button>
                    <button
                      aria-expanded={conditions}
                      className={
                        "text-button " + (conditions ? "active-text" : "")
                      }
                      onClick={() => setConditions(!conditions)}
                    >
                      <SlidersHorizontal size={16} />
                      More conditions
                      {extraConditions > 0 && (
                        <span className="tag">{extraConditions} active</span>
                      )}
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
                {conditions && (
                  <div className="conditions">
                    <FieldSelect
                      label="Weather"
                      value={options.weather}
                      onChange={(weather) =>
                        setOptions({ ...options, weather })
                      }
                      values={["Auto", "", "Sun", "Rain", "Sand", "Snow"]}
                    />
                    <FieldSelect
                      label="Terrain"
                      value={options.terrain}
                      onChange={(terrain) =>
                        setOptions({ ...options, terrain })
                      }
                      values={[
                        "Auto",
                        "",
                        "Grassy",
                        "Psychic",
                        "Electric",
                        "Misty",
                      ]}
                    />
                    {["team", "opponent"].map((side) => (
                      <div key={side} className="condition-checks">
                        <strong>
                          {side === "team" ? "Your side" : "Opponent side"}
                        </strong>
                        {[
                          ["reflect", "Reflect"],
                          ["lightScreen", "Light Screen"],
                          ["helpingHand", "Helping Hand"],
                          ["tailwind", "Tailwind"],
                          ["friendGuard", "Friend Guard"],
                          ["protect", "Protect"],
                        ].map(([key, label]) => (
                          <label key={key}>
                            <input
                              type="checkbox"
                              checked={options[side]?.[key] || false}
                              onChange={(e) =>
                                setOptions({
                                  ...options,
                                  [side]: {
                                    ...options[side],
                                    [key]: e.target.checked,
                                  },
                                })
                              }
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    ))}
                    <div className="condition-checks">
                      <strong>Move context</strong>
                      <label>
                        <input
                          type="checkbox"
                          checked={!!options.singleTarget}
                          onChange={(e) =>
                            setOptions({
                              ...options,
                              singleTarget: e.target.checked,
                            })
                          }
                        />
                        Only one target remains
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={!!options.critical}
                          onChange={(e) =>
                            setOptions({
                              ...options,
                              critical: e.target.checked,
                            })
                          }
                        />
                        Critical hit
                      </label>
                    </div>
                  </div>
                )}
                {quickControls && (
                  <div className="matrix-quick-controls">
                    <QuickSet
                      value={team[member] || team[0]}
                      onChange={(p) =>
                        setTeam(team.map((x, i) => (i === member ? p : x)))
                      }
                      title={
                        quickCalc
                          ? `Battle state vs ${selected} · leading estimated set`
                          : "Team battle state · choose a matchup for automatic stages"
                      }
                      effective={quickCalc?.teamStats}
                    />
                    <QuickField options={options} onChange={setOptions} />
                  </div>
                )}
                <div className="table-toolbar">
                  <div className="segmented">
                    <button
                      className={mode === "both" ? "active" : ""}
                      onClick={() => setMode("both")}
                    >
                      ↗ / ↙ Both
                    </button>
                    <button
                      className={mode === "outgoing" ? "active" : ""}
                      onClick={() => setMode("outgoing")}
                    >
                      <ArrowUpRight size={15} />
                      Damage dealt
                    </button>
                    <button
                      className={mode === "incoming" ? "active" : ""}
                      onClick={() => setMode("incoming")}
                    >
                      <ArrowDownLeft size={15} />
                      Damage received
                    </button>
                  </div>
                  <div className="table-tools">
                    <button
                      className={gapsOnly ? "gap-toggle active" : "gap-toggle"}
                      aria-pressed={gapsOnly}
                      onClick={() => setGapsOnly(!gapsOnly)}
                    >
                      {gapsOnly ? "Show all rows" : "Show coverage gaps"}
                    </button>
                    <label className="search">
                      <Search size={15} />
                      <input
                        placeholder={
                          isVersus
                            ? "Search opponent team…"
                            : "Search all meta…"
                        }
                        aria-label={
                          isVersus ? "Search opponent team" : "Search all meta"
                        }
                        maxLength={100}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    {!isVersus && (
                      <select
                        aria-label="Matrix scope"
                        value={limit}
                        onChange={(e) => {
                          setLimit(Number(e.target.value));
                          setSelected(null);
                        }}
                      >
                        <option value={20}>Top 20</option>
                        <option value={40}>Top 40</option>
                        <option value={80}>Top 80</option>
                        <option value={0}>
                          All {data?.threats.length || "meta"}
                        </option>
                      </select>
                    )}
                    <select
                      aria-label="Sort threats"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="usage">
                        {isVersus ? "Opponent team order" : "Tournament usage"}
                      </option>
                      <option value="risk">Team survival gaps</option>
                    </select>
                  </div>
                </div>
                <div className="table-explainer">
                  <Info size={14} />
                  Bars show damage: solid to minimum, striped to maximum (100%
                  HP scale). Color uses maximum damage; ✹ marks KO chance above
                  50%. Speed is labeled separately.{" "}
                  <strong>Click any cell to inspect.</strong>
                </div>
                <div className="matrix-context">
                  <span>
                    {isVersus
                      ? "Exact opponent sets"
                      : query.trim()
                        ? "Search across all loaded threats"
                        : limit
                          ? `Top ${limit} by event usage`
                          : "Entire loaded metagame"}{" "}
                    · {visible.length} rows
                    {gapsOnly
                      ? ` · no ≥95% ${mode === "incoming" ? "survival" : "OHKO"} option`
                      : ""}
                  </span>
                  <span>
                    Weather: {options.weather || "None"} · Terrain:{" "}
                    {options.terrain || "None"}
                    {options.trickRoom ? " · Trick Room ON" : ""}
                    {options.autoIntimidate === false
                      ? " · Intimidate OFF"
                      : ""}
                    {options.team?.tailwind ? " · Your Tailwind ON" : ""}
                    {options.opponent?.tailwind ? " · Foe Tailwind ON" : ""}
                  </span>
                </div>
                <div
                  className={"matrix-wrap " + (busy ? "is-busy" : "")}
                  aria-busy={busy}
                >
                  <table
                    className="matrix"
                    style={{ minWidth: Math.max(820, 225 + team.length * 158) }}
                  >
                    <thead>
                      <tr>
                        <th className="threat-heading">
                          OPPONENT{" "}
                          <span>
                            {isVersus
                              ? "EXACT TEAM SETS"
                              : "EVENT USAGE / GAME RANK"}
                          </span>
                        </th>
                        {team.map((p, i) => (
                          <th key={i} className={member === i ? "focused" : ""}>
                            <div>
                              <Avatar
                                small
                                name={displaySpecies(p, cat?.megaItems)}
                                index={i}
                              />
                              {p.species}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((r, ri) => (
                        <React.Fragment key={r.id || r.species}>
                          <tr
                            className={
                              selected === (r.id || r.species)
                                ? "row-selected"
                                : ""
                            }
                          >
                            <td>
                              <button
                                className="threat-label"
                                onClick={() =>
                                  setSelected(
                                    selected === (r.id || r.species)
                                      ? null
                                      : r.id || r.species,
                                  )
                                }
                              >
                                <span className="rank">
                                  {String(ri + 1).padStart(2, "0")}
                                </span>
                                <Avatar
                                  small
                                  name={displaySpecies(
                                    r.sets.find(
                                      (s) =>
                                        s.kind === "estimated" ||
                                        s.kind === "exact",
                                    ) || { species: r.species },
                                    cat?.megaItems,
                                  )}
                                  index={ri + 2}
                                />
                                <span>
                                  <strong>{r.species}</strong>
                                  <small>
                                    {r.exact ? (
                                      `${r.sets[0].item || "No item"} · ${r.sets[0].nature}`
                                    ) : (
                                      <>
                                        {r.usage != null
                                          ? `${num(r.usage)}% of teams`
                                          : "No event sample"}{" "}
                                        · #{r.rank || "—"} in game
                                      </>
                                    )}
                                  </small>
                                </span>
                                {selected === (r.id || r.species) ? (
                                  <ChevronDown size={15} />
                                ) : (
                                  <ChevronRight size={15} />
                                )}
                              </button>
                            </td>
                            {r.cells.map((c, i) => {
                              const chance =
                                mode === "incoming" ? c.survive : c.ko;
                              const damage =
                                mode === "outgoing" ? c.out : c.incoming;
                              return (
                                <td
                                  key={i}
                                  className={member === i ? "focused" : ""}
                                >
                                  <MatrixCell
                                    cell={c}
                                    mode={mode}
                                    own={team[i]?.species || "Updating"}
                                    foe={r.species}
                                    expanded={
                                      selected === (r.id || r.species) &&
                                      member === i
                                    }
                                    onClick={() => {
                                      setSelected(r.id || r.species);
                                      setMember(i);
                                    }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                          {selected === (r.id || r.species) && (
                            <tr className="detail-row">
                              <td colSpan={team.length + 1}>
                                <button
                                  className="text-button close-matchup"
                                  onClick={() => setSelected(null)}
                                >
                                  <X size={15} /> Close matchup · back to matrix
                                </button>
                                <Matchup
                                  key={`${r.id || r.species}-${member}`}
                                  team={team[member]}
                                  threat={r}
                                  onOpponentChange={
                                    isVersus
                                      ? (p) =>
                                          setOpponentTeam((t) =>
                                            t.map((v, i) =>
                                              i === r.opponentIndex ? p : v,
                                            ),
                                          )
                                      : undefined
                                  }
                                  speedRange={r.cells[member]?.speedRange}
                                  options={options}
                                  onOptions={setOptions}
                                  cat={cat}
                                  onApply={(p) =>
                                    setTeam(
                                      team.map((x, i) =>
                                        i === member ? p : x,
                                      ),
                                    )
                                  }
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                  {!visible.length && (
                    <div className="empty">
                      <Layers3 size={30} />
                      <h3>
                        {isVersus && !opponentTeam.length
                          ? "Add an opponent team"
                          : busy
                            ? "Calculating your matrix"
                            : data
                              ? gapsOnly
                                ? "No coverage gaps in this view"
                                : "No matching threats"
                              : "Preparing your metagame"}
                      </h3>
                      <p>
                        {isVersus && !opponentTeam.length
                          ? "Import team text or a Poképaste, or choose a published opponent above."
                          : busy
                            ? "Applying your team, modeled spreads and battle conditions…"
                            : data
                              ? gapsOnly
                                ? "Every row has at least one teammate meeting the selected 95% threshold."
                                : "Try a different search, or check any import errors above."
                              : "The first launch fetches public data. Future launches use the local cache."}
                      </p>
                    </div>
                  )}
                </div>
                <div className="legend">
                  <span>
                    <i className="green-dot" />
                    Damage &lt;50%
                  </span>
                  <span>
                    <i className="yellow-dot" />
                    Damage 50–80%
                  </span>
                  <span>
                    <i className="red-dot" />
                    Damage &gt;80%
                  </span>
                  <span className="legend-note">
                    Conditional on a hit ·{" "}
                    {isVersus ? "exact imported sets" : "estimated sets"} · not
                    a battle win probability
                  </span>
                </div>
              </section>
              {!isVersus && (
                <div className="method-note">
                  <Shield size={19} />
                  <p>
                    <strong>Know what the numbers mean.</strong> The matrix
                    models the most-used item, nature, ability and four moves
                    with the selected reported spread sample. These are separate
                    marginal distributions, not observed full sets. Percentages
                    are normalized within the displayed spread sample; the
                    detail view shows its coverage. All field conditions apply
                    to both the table and individual calculations.
                  </p>
                </div>
              )}
            </>
          )}
          {tab === "sources" && (
            <Sources data={data} status={status} onRefresh={refresh} />
          )}
          {tab === "teams" && (
            <Published
              data={data}
              onOpponent={async (t) => {
                try {
                  setBusy(true);
                  changeOpponent(
                    (await api("import", { url: t.url })).team,
                    t.title,
                  );
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
              onImport={async (url) => {
                try {
                  setBusy(true);
                  changeTeam((await api("import", { url })).team);
                  setTab("matchups");
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
              busy={busy}
            />
          )}
          <footer>
            <span>
              META LENS <b> / </b> MADE FOR THE NEXT TURN
            </span>
            <a
              href="https://github.com/nerd-of-now/NCP-VGC-Damage-Calculator"
              target="_blank"
              rel="noreferrer"
            >
              Powered by the NCP engine <ExternalLink size={12} />
            </a>
          </footer>
        </div>
      </main>
      {modal?.type === "opponent-import" && (
        <ImportModal
          title="Import opponent team"
          opponent
          close={() => setModal(null)}
          onImport={changeOpponent}
          current={opponentTeam}
        />
      )}
      {modal?.type === "opponent-edit" && cat && (
        <EditModal
          set={opponentTeam[modal.index]}
          cat={cat}
          close={() => setModal(null)}
          onSave={(p) => {
            setOpponentTeam((t) =>
              t.map((v, i) => (i === modal.index ? p : v)),
            );
            setModal(null);
          }}
          onRemove={() => {
            setOpponentTeam((t) => t.filter((_, i) => i !== modal.index));
            setSelected(null);
            setModal(null);
          }}
        />
      )}
      {modal?.type === "import" && (
        <ImportModal
          close={() => setModal(null)}
          onImport={changeTeam}
          current={team}
        />
      )}
      {modal?.type === "edit" && cat && (
        <EditModal
          set={team[modal.index]}
          cat={cat}
          close={() => setModal(null)}
          onSave={(p) => {
            setTeam(team.map((x, i) => (i === modal.index ? p : x)));
            setModal(null);
          }}
          onRemove={
            team.length > 1
              ? () => {
                  setTeam(team.filter((_, i) => i !== modal.index));
                  setRows([]);
                  setSelected(null);
                  setMember(0);
                  setModal(null);
                }
              : null
          }
        />
      )}
    </div>
  );
}
function Modal({ title, close, children, wide }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"modal " + (wide ? "wide" : "")}
      >
        <div className="modal-title">
          <h2>{title}</h2>
          <button
            onClick={close}
            className="icon-button"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function ImportModal({
  close,
  onImport,
  current,
  title = "Bring your team into focus",
  opponent = false,
}) {
  const [text, setText] = useState(""),
    [url, setUrl] = useState(""),
    [append, setAppend] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title={title} close={close}>
      <p>
        Paste one Pokémon, a core, or your full team. Standard EV pastes convert
        to equivalent level-50 Champions stat points.
      </p>
      <label className="field-label">
        Poképaste URL
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://pokepast.es/…"
        />
      </label>
      <label className="field-label">
        Or paste team text
        <textarea
          autoFocus
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "Rillaboom @ Miracle Seed\nAbility: Grassy Surge\nSPs: 32 HP / 32 Atk / 2 Spe\nAdamant Nature\n- Grassy Glide\n- Wood Hammer"
          }
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={append}
          onChange={(e) => setAppend(e.target.checked)}
        />
        Add to {opponent ? "the opponent" : "my current"} team
      </label>
      {error && <div className="alert">{error}</div>}
      <div className="modal-actions">
        <button className="secondary" onClick={close}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={busy || (!text && !url)}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await api("import", url ? { url } : { text });
              const next = append ? [...current, ...result.team] : result.team;
              if (next.length > 6)
                throw new Error("A team can have at most six Pokémon.");
              onImport(next);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Importing…" : opponent ? "Compare teams" : "Analyze my team"}
          <ArrowRight size={16} />
        </button>
      </div>
    </Modal>
  );
}
function SetEditor({ value, onChange, cat, compact = false, effective }) {
  const p = value;
  const update = (key, v) => onChange({ ...p, [key]: v });
  const total = keys.reduce((s, k) => s + (p.sp?.[k] || 0), 0);
  return (
    <div className={"set-editor " + (compact ? "compact" : "")}>
      <div className="editor-fields">
        <FieldSelect
          label="Pokémon"
          value={p.species}
          onChange={(s) => update("species", s)}
          values={cat.species}
        />
        <FieldSelect
          label="Nature"
          value={p.nature}
          onChange={(s) => update("nature", s)}
          values={cat.natures}
        />
        <FieldSelect
          label="Held item"
          value={p.item}
          onChange={(s) => update("item", s)}
          values={["", ...cat.items]}
        />
        <FieldSelect
          label="Ability"
          value={p.ability}
          onChange={(s) => update("ability", s)}
          values={["", ...cat.abilities]}
        />
      </div>
      <div className="sp-heading">
        <strong>Stat points</strong>
        <span className={total > 66 ? "invalid" : ""}>
          {total} / 66 allocated
        </span>
      </div>
      <div className="sp-grid">
        {keys.map((k, i) => (
          <label key={k}>
            {labels[i]}
            <span className="sp-step">
              <button
                aria-label={`Decrease ${labels[i]} points`}
                onClick={() =>
                  update("sp", {
                    ...p.sp,
                    [k]: Math.max(0, (p.sp?.[k] || 0) - 1),
                  })
                }
              >
                −
              </button>
              <input
                type="number"
                min="0"
                max="32"
                value={p.sp?.[k] || 0}
                onChange={(e) =>
                  update("sp", { ...p.sp, [k]: Number(e.target.value) })
                }
              />
              <button
                aria-label={`Increase ${labels[i]} points`}
                onClick={() =>
                  update("sp", {
                    ...p.sp,
                    [k]: Math.min(32, (p.sp?.[k] || 0) + 1),
                  })
                }
              >
                +
              </button>
            </span>
          </label>
        ))}
      </div>
      <div className="editor-moves">
        {[0, 1, 2, 3].map((i) => (
          <FieldSelect
            key={i}
            label={`Move ${i + 1}`}
            value={p.moves[i] || "(No Move)"}
            values={cat.moves}
            onChange={(v) => {
              const moves = [...p.moves];
              moves[i] = v;
              update("moves", moves);
            }}
          />
        ))}
      </div>
      <details>
        <summary>Battle state & move details</summary>
        <div className="editor-fields">
          <label className="field-label">
            Current HP %
            <input
              type="number"
              min="1"
              max="100"
              value={p.hpPercent ?? 100}
              onChange={(e) => update("hpPercent", Number(e.target.value))}
            />
          </label>
          <FieldSelect
            label="Status"
            value={p.status || "Healthy"}
            values={[
              "Healthy",
              "Burned",
              "Paralyzed",
              "Poisoned",
              "Badly Poisoned",
              "Asleep",
              "Frozen",
            ]}
            onChange={(s) => update("status", s)}
          />
        </div>
        <div className="boost-grid">
          {keys.slice(1).map((k, i) => (
            <label key={k}>
              {labels[i + 1]} stage
              <input
                type="number"
                min="-6"
                max="6"
                value={displayedStage(p, effective, k)}
                onChange={(e) =>
                  update("stageOverrides", {
                    ...p.stageOverrides,
                    [k]: Number(e.target.value),
                  })
                }
              />
            </label>
          ))}
        </div>
        <p className="tiny-note">
          {effective
            ? "Stages include automatic abilities and items for this matchup."
            : "Automatic stages depend on the opponent; open a matchup to inspect them."}{" "}
          Editing a stage sets its final value. Reset stages in the quick
          controls to restore automatic behavior.
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={p.mega !== false}
            onChange={(e) => update("mega", e.target.checked)}
          />
          Mega evolve if holding the matching stone
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={p.abilityOn !== false}
            onChange={(e) => update("abilityOn", e.target.checked)}
          />
          Ability activated (e.g. Intimidate / Flash Fire)
        </label>
        {p.moves
          .filter((m) => m !== "(No Move)")
          .map((m) => (
            <div key={m} className="move-options">
              <strong>{m}</strong>
              <label>
                Hits
                <input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Auto"
                  value={p.moveOptions?.[m]?.hits ?? ""}
                  onChange={(e) =>
                    update("moveOptions", {
                      ...p.moveOptions,
                      [m]: {
                        ...p.moveOptions?.[m],
                        hits: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      },
                    })
                  }
                />
              </label>
              <label>
                Prior triggers
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={p.moveOptions?.[m]?.timesAffected ?? 0}
                  onChange={(e) =>
                    update("moveOptions", {
                      ...p.moveOptions,
                      [m]: {
                        ...p.moveOptions?.[m],
                        timesAffected: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={!!p.moveOptions?.[m]?.double}
                  onChange={(e) =>
                    update("moveOptions", {
                      ...p.moveOptions,
                      [m]: { ...p.moveOptions?.[m], double: e.target.checked },
                    })
                  }
                />
                Double power
              </label>
            </div>
          ))}
        <p className="tiny-note">
          Move controls apply only when supported by the move (e.g. Rage Fist
          triggers or Facade’s conditional power). Ability activation, switch
          order and move prerequisites must match the position you are testing.
        </p>
      </details>
      {p.warning && <p className="warning-note">{p.warning}</p>}
    </div>
  );
}
function EditModal({ set, cat, close, onSave, onRemove }) {
  const [p, setP] = useState(structuredClone(set)),
    [error, setError] = useState("");
  return (
    <Modal title={`Edit ${set.species}`} close={close} wide>
      <SetEditor value={p} onChange={setP} cat={cat} />
      {error && <div className="alert">{error}</div>}
      <div className="modal-actions">
        {onRemove && (
          <button className="text-button danger" onClick={onRemove}>
            Remove Pokémon
          </button>
        )}
        <button
          className="primary"
          onClick={async () => {
            try {
              await api("calculate", { team: p, opponent: p });
              onSave(p);
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Save changes
          <Check size={16} />
        </button>
      </div>
    </Modal>
  );
}
function Matchup({
  team,
  threat,
  options,
  onOptions,
  cat,
  onApply,
  speedRange,
  onOpponentChange,
}) {
  const [opponent, setOpponent] = useState(threat.sets[0]),
    [candidate, setCandidate] = useState(structuredClone(team)),
    [calc, setCalc] = useState(null),
    [error, setError] = useState(""),
    [direction, setDirection] = useState("outgoing"),
    [move, setMove] = useState(""),
    [edit, setEdit] = useState(false);
  const updateOpponent = (p) => {
    setOpponent(p);
    onOpponentChange?.(p);
  };
  useEffect(() => {
    if (threat.exact) setOpponent(threat.sets[0]);
  }, [threat.exact, threat.sets]);
  useEffect(() => {
    setCandidate(structuredClone(team));
  }, [team]);
  useEffect(() => {
    if (!opponent) return;
    const c = new AbortController();
    const timer = setTimeout(
      () =>
        api("calculate", { team: candidate, opponent, options }, c.signal)
          .then((x) => {
            setCalc(x);
            setError("");
          })
          .catch((e) => {
            if (e.name !== "AbortError") {
              setError(e.message);
              setCalc(null);
            }
          }),
      120,
    );
    return () => {
      c.abort();
      clearTimeout(timer);
    };
  }, [candidate, opponent, options]);

  const current =
    calc?.[direction]?.find((x) => x.move === move) ||
    [...(calc?.[direction] || [])]
      .filter((x) => !x.support)
      .sort(
        (a, b) => (b.ko ?? -1) - (a.ko ?? -1) || b.maxPercent - a.maxPercent,
      )[0] ||
    calc?.[direction]?.[0];
  if (!opponent)
    return (
      <div className="detail-empty">
        No supported spreads available for this Pokémon. Check source warnings.
      </div>
    );
  return (
    <div className="matchup">
      <div className="matchup-heading">
        <div>
          <span className="eyebrow">03 / MATCHUP LAB</span>
          <h3>
            <PokemonSprite
              name={
                calc?.teamStats.name ||
                displaySpecies(candidate, cat?.megaItems)
              }
            />
            {candidate.species}
            <span>vs.</span>
            <PokemonSprite
              name={
                calc?.opponentStats.name ||
                displaySpecies(opponent, cat?.megaItems)
              }
            />
            {opponent.species}
          </h3>
        </div>
        <div className="matchup-context">
          <span>Lv. 50</span>
          <span>{calc?.weather || "No weather"}</span>
          <span>
            {calc?.terrain ? calc.terrain + " Terrain" : "No terrain"}
          </span>
        </div>
      </div>
      {!threat.exact && (
        <SetPicker
          threat={threat}
          opponent={opponent}
          onSelect={(set) => {
            updateOpponent(set);
          }}
        />
      )}
      <div className="set-summary">
        <span>{opponent.item || "No item"}</span>
        <span>{opponent.ability}</span>
        <span>{opponent.nature}</span>
        <span className="mono">
          {keys.map((k) => opponent.sp[k] || 0).join(" / ")} SP
        </span>
        <span className="tag">
          {threat.exact
            ? "Exact opponent set"
            : opponent.kind === "published"
              ? "Published set"
              : "Estimated combination"}
        </span>
      </div>
      <p className="sample-note">
        {opponent.spreadNote && <>{opponent.spreadNote} </>}
        {threat.exact ? (
          "Exact imported spread. KO chances assume the move connects and the selected battle state applies."
        ) : (
          <>
            Modeled spreads cover <strong>{num(threat.spreadCoverage)}%</strong>{" "}
            of reported spread usage. Remaining spreads are not modeled.
            Published sets have no ladder frequency. KO chances below are
            conditional on the selected set and the move connecting.
          </>
        )}
      </p>
      {calc && (
        <div className="compact-speed">
          <Activity size={14} />
          <strong>
            Speed {calc.teamStats.sp} vs {calc.opponentStats.sp}
          </strong>
          <span>
            {calc.teamStats.sp === calc.opponentStats.sp
              ? "Tie"
              : calc.teamStats.sp > calc.opponentStats.sp
                ? "You faster"
                : "Foe faster"}
          </span>
          {!threat.exact && speedRange && (
            <span>
              Modeled foe range {speedRange.opponent[0]}–
              {speedRange.opponent[1]} · modal nature
            </span>
          )}
          {options.trickRoom && (
            <span>Trick Room reverses equal-priority order</span>
          )}
        </div>
      )}
      <div className="quick-matchup">
        <QuickSet
          value={candidate}
          onChange={(p) => {
            setCandidate(p);
            onApply(p);
          }}
          title="Your battle state"
          effective={calc?.teamStats}
        />
        <QuickSet
          value={opponent}
          onChange={updateOpponent}
          title="Opponent battle state"
          effective={calc?.opponentStats}
        />
      </div>
      <QuickField options={options} onChange={onOptions} />
      {calc && (
        <div className="auto-effects">
          <strong>Applied automatically</strong>
          {calc.effects.map((e, i) => (
            <span key={i}>
              {e.side === "team" ? "You" : "Foe"}: {e.text}
            </span>
          ))}
          <span>
            {calc.weather || "No weather"} ·{" "}
            {calc.terrain ? calc.terrain + " Terrain" : "No terrain"}
          </span>
        </div>
      )}
      <button
        className="secondary edit-inline"
        onClick={() => setEdit(!edit)}
        aria-expanded={edit}
      >
        <Settings2 size={14} />
        {edit ? "Hide set editors" : "Edit these sets"}
      </button>
      {edit && cat && (
        <div className="dual-edit">
          <section>
            <h4>Your candidate</h4>
            <SetEditor
              value={candidate}
              effective={calc?.teamStats}
              onChange={setCandidate}
              cat={cat}
              compact
            />
            <button className="secondary" onClick={() => onApply(candidate)}>
              Apply candidate to my team
            </button>
          </section>
          <section>
            <h4>Opponent scenario</h4>
            <SetEditor
              value={opponent}
              effective={calc?.opponentStats}
              onChange={updateOpponent}
              cat={cat}
              compact
            />
          </section>
        </div>
      )}
      {error && <div className="alert">{error}</div>}
      {calc && (
        <>
          <div className="move-panels">
            {["outgoing", "incoming"].map((dir) => (
              <section key={dir}>
                <div className="move-panel-title">
                  {dir === "outgoing" ? (
                    <ArrowUpRight size={17} />
                  ) : (
                    <ArrowDownLeft size={17} />
                  )}
                  <strong>
                    {dir === "outgoing" ? "Damage dealt" : "Damage received"}
                  </strong>
                  <span>
                    {dir === "outgoing"
                      ? calc.opponentStats.hp
                      : calc.teamStats.hp}{" "}
                    max HP
                  </span>
                </div>
                {calc[dir].map((m, i) => (
                  <button
                    key={i}
                    className={
                      "move-row " +
                      (direction === dir && current?.move === m.move
                        ? "selected"
                        : "")
                    }
                    onClick={() => {
                      setDirection(dir);
                      setMove(m.move);
                    }}
                  >
                    <div>
                      <strong>
                        {m.move}
                        {m.priority !== 0 && (
                          <small className="move-priority">
                            {" "}
                            · priority {m.priority > 0 ? "+" : ""}
                            {m.priority}
                          </small>
                        )}
                      </strong>
                      <span>
                        {m.support
                          ? "Status move"
                          : `${m.min}–${m.max} HP · ${num(m.minPercent)}–${num(m.maxPercent)}%`}
                      </span>
                    </div>
                    <div className="range-track">
                      <span
                        style={{
                          left: 0,
                          width: `${Math.min(100, m.maxPercent)}%`,
                          background:
                            dir === "incoming" ? "#cc856c" : "#82a967",
                        }}
                      />
                      <b style={{ left: `${Math.min(100, m.minPercent)}%` }} />
                    </div>
                    <small>
                      {m.support
                        ? "—"
                        : dir === "outgoing"
                          ? `${pct(m.ko)} KO`
                          : `${pct(m.survive)} survive`}
                    </small>
                  </button>
                ))}
              </section>
            ))}
          </div>
          <div className="exact-panel">
            <div>
              <div className="eyebrow">EXACT DAMAGE / SELECT A MOVE ABOVE</div>
              <h4>{current?.move}</h4>
              <p className="calc-description">{current?.description}</p>
              {current && !current.support && (
                <>
                  <div
                    className="roll-chart"
                    aria-label="Damage probability distribution"
                  >
                    {current.rolls.map(([damage, chance]) => (
                      <div key={damage} title={`${damage} HP: ${pct(chance)}`}>
                        <i
                          className={damage >= current.hp ? "ko-roll" : ""}
                          style={{
                            height: `${Math.max(3, (chance / Math.max(...current.rolls.map((x) => x[1]))) * 60)}px`,
                          }}
                        />
                        <span>{damage}</span>
                      </div>
                    ))}
                  </div>
                  <div className="roll-caption">
                    {current.rolls.length} distinct damage totals · repeated
                    rolls are weighted · target at {current.hp} /{" "}
                    {current.maxHP} HP
                  </div>
                </>
              )}
              {current?.notes.map((n) => (
                <p key={n} className="warning-note">
                  {n}
                </p>
              ))}
            </div>
          </div>
          <InvestmentExplorer
            team={candidate}
            opponent={opponent}
            options={options}
            direction={direction}
            move={current}
            onApply={(p) => {
              setCandidate(p);
              onApply(p);
            }}
          />
          <details className="distribution-details">
            <summary>Inspect the underlying in-game distributions</summary>
            <div className="distribution-grid">
              {["items", "natures", "abilities", "moves"].map((k) => (
                <section key={k}>
                  <h4>{k}</h4>
                  {threat.distributions[k].slice(0, 8).map(([name, usage]) => (
                    <div key={name}>
                      <span>{name}</span>
                      <strong>{usage}%</strong>
                    </div>
                  ))}
                </section>
              ))}
            </div>
            <p className="tiny-note">
              Capture: {threat.capturedAt}. These are marginal frequencies;
              joint combinations are not provided.
            </p>
          </details>
        </>
      )}
    </div>
  );
}
function Sources({ data, status, onRefresh }) {
  const [format, setFormat] = useState(data?.format || LATEST_METAGAME),
    [limit, setLimit] = useState(data?.config?.limit || 40),
    [spreadLimit, setSpreadLimit] = useState(data?.config?.spreadLimit || 8),
    [publishedLimit, setPublishedLimit] = useState(
      data?.config?.publishedLimit || 1000,
    ),
    [events, setEvents] = useState(data?.selectedEvents.map((e) => e.id) || []),
    [autoEvents, setAutoEvents] = useState(!data?.config?.eventIds);
  useEffect(() => {
    if (data) {
      setEvents(data.selectedEvents.map((e) => e.id));
      setFormat(data.format);
      setPublishedLimit(data.config.publishedLimit);
      setAutoEvents(!data.config.eventIds);
    }
  }, [data]);
  return (
    <div className="sources">
      <div className="source-grid">
        {[
          [
            "01",
            "Tournament representation",
            "Pokedata",
            "Species frequency among teams with public sheets. Each team counts once; recent events are pooled by participant count. Missing sheets are excluded.",
          ],
          [
            "02",
            "Set & spread distributions",
            "MunchStats in-game Battle Data",
            "Captures from the actual Champions game. Species popularity is a rank, not a usage percentage. Items, natures and spreads are separate distributions.",
          ],
          [
            "03",
            "Published full sets",
            "VGCPastes + Poképaste",
            "Real combinations from shared teams. The selected number of recent spread-bearing teams is indexed. These are examples, not an unbiased usage distribution.",
          ],
        ].map(([n, title, source, body]) => (
          <article key={n}>
            <span className="step">{n}</span>
            <h3>{title}</h3>
            <strong>{source}</strong>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <section className="source-config">
        <h2>Choose the metagame sample</h2>
        <div className="source-controls">
          <FieldSelect
            label="Metagame (M-C is latest)"
            value={format}
            values={["M-C", "M-B"]}
            onChange={(value) => {
              setFormat(value);
              setEvents(
                metagameEvents(data?.events || [], value).map((e) => e.id),
              );
              setAutoEvents(true);
            }}
          />
          <label className="field-label">
            Metagame coverage
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value="20">Top 20 Pokémon</option>
              <option value="40">Top 40 Pokémon</option>
              <option value="80">Top 80 Pokémon</option>
              <option value="1000">All available Pokémon</option>
            </select>
          </label>
          <label className="field-label">
            Spreads per Pokémon
            <select
              value={spreadLimit}
              onChange={(e) => setSpreadLimit(Number(e.target.value))}
            >
              <option value="8">Top 8 spreads · fast</option>
              <option value="16">Top 16 spreads</option>
              <option value="1000">All reported spreads</option>
            </select>
          </label>
          <label className="field-label">
            Published team sample
            <select
              value={publishedLimit}
              onChange={(e) => setPublishedLimit(Number(e.target.value))}
            >
              <option value="24">24 teams · fast</option>
              <option value="100">100 teams</option>
              <option value="1000">All available teams</option>
            </select>
          </label>
          <button
            className="primary"
            disabled={status.running}
            onClick={() =>
              onRefresh({
                format,
                eventIds: autoEvents ? null : events,
                limit,
                spreadLimit,
                publishedLimit,
              })
            }
          >
            <RefreshCw size={16} />
            Refresh selected sources
          </button>
        </div>
        <p>
          All published events dated within the selected regulation are selected
          by default. Untick events for a custom sample. In-game ladder data
          always uses its latest capture, including when viewing a historical
          metagame.
        </p>
        <div className="event-list">
          {metagameEvents(data?.events || [], format).map((e) => (
            <label key={e.id}>
              <input
                type="checkbox"
                checked={events.includes(e.id)}
                onChange={(x) => {
                  setAutoEvents(false);
                  setEvents(
                    x.target.checked
                      ? [...events, e.id]
                      : events.filter((id) => id !== e.id),
                  );
                }}
              />
              {e.name}
            </label>
          ))}
        </div>
      </section>
      <section className="source-config">
        <h2>Source health & freshness</h2>
        <p>
          Responses cache for 24 hours; immutable Poképastes cache for 30 days.
          Refresh rebuilds the analysis from available data. Failed sources
          retain their cached values and are labeled stale.
        </p>
        {data?.health.map((h, i) => (
          <div className="health-row" key={i}>
            <span className={h.stale ? "yellow-dot" : "green-dot"} />
            <strong>{h.name}</strong>
            <span>
              {h.stale ? "Stale cached response" : "Available"} · fetched{" "}
              {new Date(h.fetchedAt).toLocaleString()}
              {h.capturedAt && ` · captured ${h.capturedAt}`}
            </span>
            <a href={h.url} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
            </a>
          </div>
        ))}
        <p>
          {data?.teamCount} usable teams of {data?.entries} entries in the
          selected events. {data?.threats.length} of {data?.requestedCount}{" "}
          requested Pokémon loaded.
        </p>
        {!!data?.warnings.length && (
          <details>
            <summary>{data.warnings.length} source / import warnings</summary>
            {data.warnings.map((w, i) => (
              <p className="warning-note" key={i}>
                {w}
              </p>
            ))}
          </details>
        )}
      </section>
      <section className="source-config">
        <h2>Calculation assumptions</h2>
        <p>
          Champions level 50, 0–32 stat points per stat and 66 total. The pinned
          Nimbasa City Post engine computes damage rolls, abilities, items,
          weather, terrain and doubles spread reduction. Auto fields simulate
          simultaneous entry, with the slower weather/terrain setter activating
          last; set an explicit field for a speed tie or another switch
          sequence.
        </p>
        <p>
          Probabilities assume the chosen move connects and its prerequisites
          hold. Multi-hit results use the displayed hit count. Focus Sash,
          Sturdy, Sitrus Berry and Oran Berry are tracked between hits.
          Initiative indicators account for effective speed, priority, Tailwind
          and Trick Room, with uncertain or blocked priority labeled. Accuracy,
          switches, Protect prediction, residual turns, most healing effects
          between hits, and team battle win rates are not simulated. Disguise
          and Ice Face report unavailable KO probabilities. Rare reactive
          mechanics beyond the documented engine adapter can require external
          verification. No claim of complete ruleset legality is made for
          arbitrary edited movesets.
        </p>
      </section>
    </div>
  );
}
function Published({ data, onImport, onOpponent, busy }) {
  const [q, setQ] = useState("");
  return (
    <section className="published">
      <label className="search">
        <Search size={16} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Pokémon, players, or events…"
        />
      </label>
      <div className="published-grid">
        {data?.published
          .filter((t) =>
            (t.title + " " + t.event + " " + (t.members || []).join(" "))
              .toLowerCase()
              .includes(q.toLowerCase()),
          )
          .map((t) => (
            <article key={t.id}>
              <div className="published-meta">
                <span>{t.id}</span>
                <span>{t.date}</span>
              </div>
              <h3>{t.title}</h3>
              {t.members?.length ? (
                <div className="team-preview" aria-label="Team Pokémon preview">
                  {t.members.map((name, i) => (
                    <figure key={`${name}-${i}`} title={name}>
                      <PokemonSprite name={name} />
                      <figcaption>{name.replace("Mega ", "M. ")}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="preview-missing">
                  Team preview unavailable in the source sheet.
                </div>
              )}
              <p>
                {t.event || "Community team"} ·{" "}
                {t.placing || "No result listed"}
              </p>
              <div>
                <span className={"tag " + (!t.hasSpread ? "muted-tag" : "")}>
                  {t.hasSpread ? "Spread included" : "No published spread"}
                </span>
                <a
                  href={t.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={"Open " + t.title}
                >
                  <ExternalLink size={16} />
                </a>
              </div>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => onImport(t.url)}
              >
                Load as my team
                <ArrowRight size={15} />
              </button>
              <button
                className="secondary opponent-load"
                disabled={busy}
                onClick={() => onOpponent(t)}
              >
                Use as opponent <Target size={15} />
              </button>
            </article>
          ))}
      </div>
      {!data && <p>Teams will appear when the data refresh completes.</p>}
      <p className="tiny-note">
        All matching teams are shown. Search to narrow the library. Teams
        without spreads import with 0 SP and a warning.
      </p>
    </section>
  );
}
createRoot(document.getElementById("root")).render(<App />);
