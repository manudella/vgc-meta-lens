import vm from "node:vm";
import fs from "node:fs";
import extend from "extend";
import { movePriority, attackOrder } from "./initiative.mjs";

// Unmodified, pinned Nimbasa City Post engine. The adapter supplies UI-independent inputs.
const $ = () => ({
  text() {},
  is() {
    return false;
  },
  prop() {
    return false;
  },
  val() {
    return undefined;
  },
});
$.extend = extend;
const ctx = vm.createContext({ $, console });
for (const file of [
  "pokedex",
  "stat_data",
  "type_data",
  "nature_data",
  "ability_data",
  "item_data",
  "move_data",
  "damage_MASTER",
  "damage_SV",
]) {
  vm.runInContext(
    fs.readFileSync(
      new URL(`../vendor/ncp/${file}.js`, import.meta.url),
      "utf8",
    ),
    ctx,
    { filename: file },
  );
}
vm.runInContext(
  `var gen=10, resultDisplayMode='SPs', pokedex=POKEDEX_CHAMPIONS, moves=MOVES_CHAMPIONS,
 typeChart=TYPE_CHART_SV, STATS=STATS_GSC, lastHighestStat=[-1,-1];
 var setHasTypeFunc=function(...types){return types.some(t=>[this.type1,this.type2].includes(t))};`,
  ctx,
);

export const STATS = ["hp", "at", "df", "sa", "sd", "sp"];
export const LABELS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];
export const dex = ctx.POKEDEX_CHAMPIONS;
export const moves = ctx.MOVES_CHAMPIONS;
export const natures = ctx.NATURES;
const id = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const namesById = new Map(Object.keys(dex).map((name) => [id(name), name]));
const megaByItem = new Map(
  Object.entries(ctx.LOCK_ITEM_LOOKUP)
    .filter(([name]) => name.startsWith("Mega "))
    .map(([name, item]) => [item, name]),
);
export function speciesName(name) {
  name = name
    .replace("Sinistcha-Masterpiece", "Sinistcha")
    .replace("Poltchageist-Artisan", "Poltchageist")
    .replace("Meowstic-F-Mega", "Mega Meowstic");
  if (name.startsWith("Vivillon-")) name = "Vivillon";
  let n = name
    .trim()
    .replace(/-Mega(-[XYZ])?$/, (_, suffix) =>
      suffix ? ` ${suffix.slice(1)}` : "",
    );
  if (/-Mega/.test(name)) n = "Mega " + n.replace("-Eternal", "");
  return namesById.get(id(n)) || namesById.get(id(name));
}
export function baseName(name) {
  return name
    .replace(/^Mega /, "")
    .replace(/ [XYZ]$/, "")
    .replace(/-Mega(?:-[XYZ])?$/, "")
    .replace("Floette-Eternal", "Floette");
}
export function megaName(name, item) {
  const mega = megaByItem.get(item);
  return mega && baseName(mega) === baseName(name) ? mega : undefined;
}
export function validateSet(set) {
  if (!set || !speciesName(set.species || ""))
    throw new Error(
      `Unknown or unsupported Champions species: ${set?.species}`,
    );
  if (!natures[set.nature || "Hardy"])
    throw new Error(`Unknown nature: ${set.nature}`);
  const points = STATS.map((k) => set.sp?.[k] ?? 0);
  if (
    points.some((x) => !Number.isInteger(x) || x < 0 || x > 32) ||
    points.reduce((a, b) => a + b, 0) > 66
  )
    throw new Error(`${set.species}: use 0–32 SP per stat, at most 66 total.`);
  if (!Array.isArray(set.moves) || set.moves.length < 1 || set.moves.length > 4)
    throw new Error(`${set.species}: provide 1–4 moves.`);
  for (const m of set.moves)
    if (!moves[m]) throw new Error(`Unsupported Champions move: ${m}`);
  if (set.item && !ctx.ITEMS_CHAMPIONS.includes(set.item))
    throw new Error(`Unsupported Champions item: ${set.item}`);
  if (set.ability && !ctx.ABILITIES_CHAMPIONS.includes(set.ability))
    throw new Error(`Unsupported Champions ability: ${set.ability}`);
  for (const value of Object.values(set.boosts || {}))
    if (!Number.isInteger(value) || Math.abs(value) > 6)
      throw new Error("Stat stages must be integers from −6 to +6.");
  if (
    set.hpPercent != null &&
    (!Number.isFinite(set.hpPercent) ||
      set.hpPercent < 1 ||
      set.hpPercent > 100)
  )
    throw new Error("HP must be 1–100%.");
  return set;
}
export function pokemon(set) {
  validateSet(set);
  let name = speciesName(set.species);
  const originalName = name;
  if (set.mega === false && name.startsWith("Mega "))
    name =
      speciesName(
        name === "Mega Floette" ? "Floette-Eternal" : baseName(name),
      ) || name;
  if (set.mega !== false) name = megaName(name, set.item) || name;
  const data = dex[name],
    sp = Object.fromEntries(STATS.map((k) => [k, set.sp?.[k] || 0])),
    nature = set.nature || "Hardy";
  const rawStats = Object.fromEntries(
    STATS.slice(1).map((k) => [
      k,
      Math.floor(
        (data.bs[k] + 20 + sp[k]) *
          (natures[nature][0] === k ? 1.1 : natures[nature][1] === k ? 0.9 : 1),
      ),
    ]),
  );
  const maxHP = data.bs.hp === 1 ? 1 : data.bs.hp + 75 + sp.hp;
  const p = {
    name,
    type1: data.t1,
    type2: data.t2 || "",
    level: 50,
    maxHP,
    curHP: Math.max(1, Math.floor((maxHP * (set.hpPercent ?? 100)) / 100)),
    HPSPs: sp.hp,
    HPEVs: Math.max(0, sp.hp * 8 - 4),
    HPIVs: 31,
    HPraw: maxHP,
    rawStats,
    stats: { ...rawStats },
    boosts: Object.fromEntries(
      STATS.slice(1).map((k) => [k, set.boosts?.[k] || 0]),
    ),
    sps: sp,
    evs: Object.fromEntries(STATS.map((k) => [k, Math.max(0, sp[k] * 8 - 4)])),
    ivs: Object.fromEntries(STATS.map((k) => [k, 31])),
    nature,
    ability:
      name.startsWith("Mega ") || name !== originalName
        ? data.ab
        : set.ability || data.ab || "",
    abilityOn:
      set.abilityOn ??
      ![
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
      ].includes(set.ability),
    highestStat: -1,
    supremeOverlord: set.faintedAllies || 0,
    rivalryGender: "Same",
    item: set.item || "",
    status: set.status || "Healthy",
    toxicCounter: 0,
    weight: data.w,
    canEvolve: !!data.canEvolve,
    hasType: ctx.setHasTypeFunc,
    isDynamax: false,
    isTerastalize: false,
    isTransformed: false,
    glaiveRushMod: false,
    tera_type: "",
    moves: [],
  };
  return p;
}
export function statsFor(set) {
  const p = pokemon(set);
  return {
    hp: p.maxHP,
    ...p.rawStats,
    name: p.name,
    types: [p.type1, p.type2].filter(Boolean),
    ability: p.ability,
  };
}

function fieldFor(options, a, b) {
  const weatherAbilities = {
    Drought: "Sun",
    Drizzle: "Rain",
    "Snow Warning": "Snow",
    "Sand Stream": "Sand",
  };
  const terrainAbilities = {
    "Grassy Surge": "Grassy",
    "Psychic Surge": "Psychic",
    "Electric Surge": "Electric",
    "Misty Surge": "Misty",
  };
  // Simultaneous switches: slower setter activates last; speed ties need an explicit field choice.
  const order = [a, b].sort((x, y) => y.rawStats.sp - x.rawStats.sp);
  let weather = "",
    terrain = "";
  for (const p of order) {
    weather = weatherAbilities[p.ability] || weather;
    terrain = terrainAbilities[p.ability] || terrain;
  }
  if (options.weather !== undefined && options.weather !== "Auto")
    weather = options.weather;
  if (options.terrain !== undefined && options.terrain !== "Auto")
    terrain = options.terrain;
  const f = {
    getNeutralGas: () => options.neutralizingGas || false,
    getWeather: () => weather,
    getTerrain: () => terrain,
    clearWeather: () => {
      weather = "";
    },
    getTailwind: (i) => !!options[i ? "opponent" : "team"]?.tailwind,
    getSwamp: () => false,
  };
  f.getSide = (i) => ({
    format: options.singleTarget ? "Singles" : "Doubles",
    weather,
    terrain,
    isGravity: !!options.gravity,
    isReflect: !!options[i ? "opponent" : "team"]?.reflect,
    isLightScreen: !!options[i ? "opponent" : "team"]?.lightScreen,
    isAuroraVeil: !!options[i ? "opponent" : "team"]?.auroraVeil,
    isHelpingHand: !!options[i ? "team" : "opponent"]?.helpingHand,
    isFriendGuard: !!options[i ? "opponent" : "team"]?.friendGuard,
    isProtect: !!options[i ? "opponent" : "team"]?.protect,
    isTailwind: f.getTailwind(i),
    isNeutralizingGas: !!options.neutralizingGas,
    spikes: 0,
  });
  return f;
}
function makeMove(name, set, options) {
  const m = structuredClone(moves[name]);
  const range = m.hitRange;
  let hits = range ? (Array.isArray(range) ? range[0] : range) : 1;
  if (range && Array.isArray(range) && range[1] === 5)
    hits =
      set.ability === "Skill Link" ? 5 : set.item === "Loaded Dice" ? 4 : 3;
  hits = set.moveOptions?.[name]?.hits ?? hits;
  if (!Number.isInteger(hits) || hits < 1 || hits > 10)
    throw new Error("Hit count must be 1–10.");
  return {
    ...m,
    name,
    isCrit: !!options.critical,
    hits,
    isZ: false,
    isDouble: set.moveOptions?.[name]?.double ? 1 : 0,
    combinePledge: 0,
    timesAffected: set.moveOptions?.[name]?.timesAffected || 0,
    usedOppMoveIndex: 0,
    getsStellarBoost: false,
    isPlusMove: false,
  };
}
function distribution(damage, hits) {
  const groups = Array.isArray(damage[0]) ? damage : [damage];
  let dist = new Map([[0, 1]]);
  for (let i = 0; i < hits; i++) {
    const rolls = groups[Math.min(i, groups.length - 1)];
    const next = new Map();
    for (const [total, p] of dist)
      for (const roll of rolls)
        next.set(
          total + roll,
          (next.get(total + roll) || 0) + p / rolls.length,
        );
    dist = next;
  }
  return [...dist].sort((a, b) => a[0] - b[0]);
}
function koProbability(damage, hits, attacker, defender) {
  const groups = Array.isArray(damage[0]) ? damage : [damage];
  const ignoresAbility = ["Mold Breaker", "Teravolt", "Turboblaze"].includes(
    attacker.ability,
  );
  // Track remaining HP and one-use items per roll, so overkill is not carried to later hits.
  let states = new Map([[`${defender.curHP}|0`, 1]]);
  for (let i = 0; i < hits; i++) {
    const next = new Map(),
      rolls = groups[Math.min(i, groups.length - 1)];
    for (const [key, probability] of states) {
      const [hp, used] = key.split("|").map(Number);
      for (const damage of rolls) {
        let remaining = Math.max(0, hp - damage),
          consumed = used;
        if (hp === 0) remaining = 0;
        else if (hp === defender.maxHP && remaining === 0) {
          if (defender.item === "Focus Sash" && !used) {
            remaining = 1;
            consumed = 1;
          } else if (defender.ability === "Sturdy" && !ignoresAbility)
            remaining = 1;
        }
        if (remaining > 0 && !consumed && attacker.ability !== "Unnerve") {
          const berry =
            defender.item === "Sitrus Berry"
              ? { threshold: 0.5, heal: Math.floor(defender.maxHP / 4) }
              : defender.item === "Oran Berry"
                ? { threshold: 0.5, heal: 10 }
                : null;
          if (berry && remaining <= defender.maxHP * berry.threshold) {
            remaining = Math.min(defender.maxHP, remaining + berry.heal);
            consumed = 1;
          }
        }
        const k = `${remaining}|${consumed}`;
        next.set(k, (next.get(k) || 0) + probability / rolls.length);
      }
    }
    states = next;
  }
  return [...states].reduce(
    (p, [key, chance]) => p + (key.startsWith("0|") ? chance : 0),
    0,
  );
}
export function calculatePair(team, opponent, options = {}) {
  const scenario = (set, side) => ({
    ...set,
    boosts: { ...set.boosts, ...options[side]?.boosts },
    mega: options[side]?.mega ?? set.mega,
    abilityOn:
      set.ability === "Intimidate" && options.autoIntimidate === false
        ? false
        : set.abilityOn,
  });
  team = scenario(team, "team");
  opponent = scenario(opponent, "opponent");
  const a = pokemon(team),
    b = pokemon(opponent);
  const initial = [
    { name: a.name, ability: a.ability, boosts: { ...a.boosts } },
    { name: b.name, ability: b.ability, boosts: { ...b.boosts } },
  ];
  a.moves = [...team.moves];
  b.moves = [...opponent.moves];
  while (a.moves.length < 4) a.moves.push("(No Move)");
  while (b.moves.length < 4) b.moves.push("(No Move)");
  a.moves = a.moves.map((m) => makeMove(m, team, options));
  b.moves = b.moves.map((m) => makeMove(m, opponent, options));
  const field = fieldFor(options, a, b);
  const results = ctx.CALCULATE_ALL_MOVES_SV(a, b, field);
  const summarize = (result, move, attacker, defender) => {
    const support = move.category === "Status" || move.name === "(No Move)";
    const hits = support ? 1 : move.hits || 1;
    const dist = distribution(result.damage, hits);
    if (dist.some(([d, p]) => !Number.isFinite(d) || !Number.isFinite(p)))
      throw new Error(`Engine returned invalid damage for ${move.name}`);
    let ko = koProbability(result.damage, hits, attacker, defender);
    const notes = [];
    if (
      defender.curHP === defender.maxHP &&
      (defender.item === "Focus Sash" || defender.ability === "Sturdy")
    )
      notes.push(
        "Full-HP survival item / ability is included in KO chance; the damage bar shows raw damage.",
      );
    if (move.hitRange)
      notes.push(
        `Conditional on ${hits} hits connecting; hit-count/accuracy randomness excluded.`,
      );
    if (hits > 1 && ["Sitrus Berry", "Oran Berry"].includes(defender.item))
      notes.push(
        "Healing berry consumption between hits is included in KO chance.",
      );
    if (
      hits > 1 &&
      [
        "Figy Berry",
        "Wiki Berry",
        "Mago Berry",
        "Aguav Berry",
        "Iapapa Berry",
      ].includes(defender.item)
    ) {
      ko = null;
      notes.push(
        "This multi-hit healing-berry interaction is not modeled; KO probability unavailable.",
      );
    }
    if (["Disguise", "Ice Face"].includes(defender.ability)) {
      ko = null;
      notes.push(
        "Disguise/Ice Face state not modeled; KO probability unavailable.",
      );
    }
    const min = dist[0][0],
      max = dist.at(-1)[0];
    const priority = movePriority(
      move,
      attacker,
      field.getTerrain(),
      ctx.pIsGrounded(attacker, field.getSide(0)),
    );
    const aimsAtFoe = [
      "normal",
      "allAdjacentFoes",
      "allAdjacent",
      "randomNormal",
      "adjacentFoe",
    ].includes(priority.target);
    let blocked = null;
    if (priority.priority > 0 && aimsAtFoe) {
      if (
        field.getTerrain() === "Psychic" &&
        ctx.pIsGrounded(defender, field.getSide(0))
      )
        blocked = "Priority blocked by Psychic Terrain";
      if (
        ["Armor Tail", "Queenly Majesty", "Dazzling"].includes(
          defender.ability,
        ) &&
        !["Mold Breaker", "Teravolt", "Turboblaze"].includes(attacker.ability)
      )
        blocked = `Priority blocked by ${defender.ability}`;
      if (
        attacker.ability === "Prankster" &&
        move.category === "Status" &&
        defender.hasType("Dark")
      )
        blocked = "Prankster blocked by Dark type";
    }
    return {
      move: move.name,
      priority: priority.priority,
      blocked,
      type: move.type,
      category: move.category,
      support,
      min,
      max,
      minPercent: (min / defender.maxHP) * 100,
      maxPercent: (max / defender.maxHP) * 100,
      ko: ko === null ? null : Math.min(1, ko),
      survive: ko === null ? null : Math.max(0, 1 - ko),
      hp: defender.curHP,
      maxHP: defender.maxHP,
      hits,
      rolls: dist,
      description: result.description,
      notes,
    };
  };
  const outgoing = results[0]
      .slice(0, team.moves.length)
      .map((r, i) => summarize(r, a.moves[i], a, b)),
    incoming = results[1]
      .slice(0, opponent.moves.length)
      .map((r, i) => summarize(r, b.moves[i], b, a));
  const orders = outgoing.flatMap((teamMove) =>
    incoming.map((opponentMove) =>
      attackOrder({
        teamMove,
        opponentMove,
        teamSpeed: a.stats.sp,
        opponentSpeed: b.stats.sp,
        teamAbility: a.ability,
        opponentAbility: b.ability,
        teamItem: a.item,
        opponentItem: b.item,
        trickRoom: !!options.trickRoom,
      }),
    ),
  );
  const effects = [];
  for (const [i, p] of [a, b].entries()) {
    const side = i ? "opponent" : "team";
    if (p.name.startsWith("Mega "))
      effects.push({ side, text: `${p.name} · ${p.ability}` });
    for (const k of STATS.slice(1))
      if (p.boosts[k] !== initial[i].boosts[k])
        effects.push({
          side,
          text: `${LABELS[STATS.indexOf(k)]} ${p.boosts[k] >= 0 ? "+" : ""}${p.boosts[k]} after automatic abilities / items`,
        });
    if (initial[i].ability === "Intimidate" && (i ? b : a).abilityOn) {
      const target = i ? a : b;
      if (target.boosts.at === initial[i ? 0 : 1].boosts.at)
        effects.push({
          side: i ? "team" : "opponent",
          text: `Intimidate prevented / neutralized · ${target.item === "Clear Amulet" ? "Clear Amulet" : target.ability}`,
        });
    }
  }
  return {
    outgoing,
    incoming,
    orders,
    effects,
    teamStats: {
      hp: a.maxHP,
      ...a.stats,
      name: a.name,
      boosts: a.boosts,
      ability: a.ability,
    },
    opponentStats: {
      hp: b.maxHP,
      ...b.stats,
      name: b.name,
      boosts: b.boosts,
      ability: b.ability,
    },
    weather: field.getWeather(),
    terrain: field.getTerrain(),
  };
}
export function catalog() {
  return {
    species: Object.keys(dex),
    moves: Object.keys(moves),
    natures: Object.keys(natures),
    items: ctx.ITEMS_CHAMPIONS,
    abilities: ctx.ABILITIES_CHAMPIONS,
  };
}
