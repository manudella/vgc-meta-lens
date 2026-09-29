import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  calculatePair,
  statsFor,
  validateSet,
  speciesName,
  STATS,
} from "../server/engine.mjs";
import { parsePaste, exportPaste } from "../server/paste.mjs";
import { sweep, analyze } from "../server/analysis.mjs";
import {
  tournamentUsage,
  ladderSets,
  pasteFromUrl,
} from "../server/sources.mjs";
const require = createRequire(import.meta.url),
  smogon = require("@smogon/calc");
const zero = () => Object.fromEntries(STATS.map((k) => [k, 0]));
const set = (species, move, extra = {}) => ({
  species,
  item: "",
  ability: "",
  nature: "Hardy",
  sp: zero(),
  moves: [move],
  ...extra,
});
const attacker = set("Garchomp", "Dragon Claw", {
  ability: "Rough Skin",
  nature: "Adamant",
  sp: { ...zero(), at: 32, hp: 2, sp: 32 },
});
const defender = set("Rillaboom", "Wood Hammer", {
  ability: "Overgrow",
  sp: { ...zero(), hp: 32, df: 32, sd: 2 },
});
test("Champions stats follow the additive SP formula, nature after points", () => {
  assert.equal(statsFor(attacker).at, 200);
  assert.equal(statsFor(attacker).hp, 185);
  assert.equal(
    statsFor({ ...attacker, sp: { ...attacker.sp, at: 0 } }).at,
    165,
  );
});
test("standard 252/252/4 EVs convert to 32/32/1 SP and round-trip", () => {
  const [p] = parsePaste(
    "Chomp (Garchomp) (M) @ Life Orb\nAbility: Rough Skin\nEVs: 4 HP / 252 Atk / 252 Spe\nJolly Nature\n- Dragon Claw",
  );
  assert.equal(p.sp.hp, 1);
  assert.equal(p.sp.at, 32);
  assert.equal(p.sp.sp, 32);
  assert.deepEqual(parsePaste(exportPaste([p]))[0].sp, p.sp);
});
test("invalid budgets, unsupported species, low IVs and missing moves fail explicitly", () => {
  assert.throws(
    () => validateSet({ ...attacker, sp: { hp: 32, at: 32, sp: 32 } }),
    /66/,
  );
  assert.throws(() => validateSet({ ...attacker, sp: { at: -1 } }), /0–32/);
  assert.throws(
    () => parsePaste("Pikachu\nIVs: 0 Atk\n- Thunderbolt"),
    /perfect IVs/,
  );
  assert.throws(() => parsePaste("Flutter Mane\n- Moonblast"), /Champions/);
  assert.throws(
    () =>
      parsePaste("Garchomp\nEVs: 252 HP / 252 Atk / 252 Spe\n- Dragon Claw"),
    /510/,
  );
  assert.throws(() => parsePaste("Garchomp"), /1–4/);
});
test("missing spreads are explicit; gender and Mega aliases import", () => {
  const [p] = parsePaste("Indeedee-F (F)\nAbility: Psychic Surge\n- Psychic");
  assert.equal(p.species, "Indeedee-F");
  assert.match(p.warning, /No spread/);
  assert.equal(speciesName("Charizard-Mega-Y"), "Mega Charizard Y");
  assert.equal(speciesName("Garchomp-Mega-Z"), "Mega Garchomp Z");
});
test("Mega stones change stats and ability, including explicit Mega pastes", () => {
  const p = set("Salamence", "Double-Edge", {
    ability: "Intimidate",
    item: "Salamencite",
  });
  assert.equal(statsFor(p).name, "Mega Salamence");
  assert.equal(statsFor(p).ability, "Aerilate");
  assert.equal(
    statsFor({ ...p, species: "Mega Salamence" }).ability,
    "Aerilate",
  );
  assert.equal(statsFor({ ...p, mega: false }).ability, "Intimidate");
});
test("single-hit damage agrees with independent Smogon engine for unchanged mechanics", () => {
  const map = {
    hp: "hp",
    at: "atk",
    df: "def",
    sa: "spa",
    sd: "spd",
    sp: "spe",
  };
  const convert = (p) =>
    new smogon.Pokemon(9, p.species, {
      level: 50,
      nature: p.nature,
      ability: p.ability,
      item: p.item,
      evs: Object.fromEntries(
        STATS.map((k) => [map[k], Math.max(0, (p.sp[k] || 0) * 8 - 4)]),
      ),
    });
  for (const [a, b, weather] of [
    [attacker, defender, ""],
    [{ ...attacker, moves: ["Earthquake"] }, defender, ""],
    [
      set("Pelipper", "Hydro Pump", {
        ability: "Keen Eye",
        nature: "Modest",
        sp: { ...zero(), sa: 32 },
      }),
      attacker,
      "Rain",
    ],
    [
      set("Gholdengo", "Make It Rain", {
        ability: "Good as Gold",
        item: "Life Orb",
      }),
      defender,
      "",
    ],
  ]) {
    const expected = smogon.calculate(
      9,
      convert(a),
      convert(b),
      new smogon.Move(9, a.moves[0]),
      new smogon.Field({ gameType: "Doubles", weather: weather || undefined }),
    );
    const actual = calculatePair(a, b, { weather, terrain: "" }).outgoing[0];
    assert.deepEqual([actual.min, actual.max], expected.range(), a.moves[0]);
  }
});
test("Intimidate, screens, weather and doubles target count affect damage", () => {
  const base = calculatePair(attacker, defender).outgoing[0];
  const intimidate = calculatePair(attacker, {
    ...defender,
    ability: "Intimidate",
  }).outgoing[0];
  assert.ok(intimidate.max < base.max);
  assert.ok(
    calculatePair(attacker, defender, { opponent: { reflect: true } })
      .outgoing[0].max < base.max,
  );
  const spread = { ...attacker, moves: ["Earthquake"] };
  assert.ok(
    calculatePair(spread, defender, { singleTarget: true }).outgoing[0].max >
      calculatePair(spread, defender).outgoing[0].max,
  );
  const fire = set("Charizard", "Flamethrower", { ability: "Blaze" });
  assert.ok(
    calculatePair(fire, defender, { weather: "Sun" }).outgoing[0].max >
      calculatePair(fire, defender, { weather: "Rain" }).outgoing[0].max,
  );
});
test("immunity is zero damage; support moves do not become offense", () => {
  assert.equal(
    calculatePair(
      { ...attacker, moves: ["Earthquake"] },
      set("Salamence", "Protect", { ability: "Intimidate" }),
    ).outgoing[0].max,
    0,
  );
  assert.equal(
    calculatePair(attacker, set("Rillaboom", "Protect")).incoming[0].support,
    true,
  );
});
test("damage distributions sum to one; KO equals threshold mass for ordinary attacks", () => {
  const r = calculatePair(
    { ...attacker, moves: ["Dragon Claw"] },
    set("Garchomp", "Protect"),
  ).outgoing[0];
  assert.ok(Math.abs(r.rolls.reduce((s, [, p]) => s + p, 0) - 1) < 1e-10);
  assert.equal(
    r.ko,
    r.rolls.reduce((s, [d, p]) => s + (d >= r.hp ? p : 0), 0),
  );
  const multi = calculatePair(
    set("Maushold", "Population Bomb", {
      ability: "Technician",
      moveOptions: { "Population Bomb": { hits: 10 } },
    }),
    defender,
  ).outgoing[0];
  assert.equal(multi.hits, 10);
  assert.ok(Math.abs(multi.rolls.reduce((s, [, p]) => s + p, 0) - 1) < 1e-8);
});
test("Mold Breaker cannot bypass Focus Sash; partial HP can be knocked out", () => {
  const a = set("Excadrill", "Earthquake", {
      ability: "Mold Breaker",
      sp: { ...zero(), at: 32 },
      boosts: { at: 6 },
    }),
    b = set("Pikachu", "Thunderbolt", { item: "Focus Sash" });
  assert.equal(calculatePair(a, b).outgoing[0].ko, 0);
  assert.equal(calculatePair(a, { ...b, hpPercent: 99 }).outgoing[0].ko, 1);
});
test("multi-hit damage breaks sash without treating first-hit overkill as later damage", () => {
  const a = set("Dragonite", "Dual Wingbeat", {
      ability: "Inner Focus",
      boosts: { at: 6 },
    }),
    b = set("Pikachu", "Thunderbolt", { item: "Focus Sash" });
  assert.equal(calculatePair(a, b).outgoing[0].ko, 1);
});
test("calculation is deterministic and does not mutate callers", () => {
  const before = JSON.stringify({ attacker, defender });
  const first = calculatePair(attacker, defender);
  assert.deepEqual(calculatePair(attacker, defender), first);
  assert.equal(JSON.stringify({ attacker, defender }), before);
});
test("budget sweep funds only required extra and never exceeds 66 points", () => {
  const result = sweep({
    team: attacker,
    opponent: defender,
    stat: "hp",
    funding: "sp",
    direction: "incoming",
    move: "Wood Hammer",
    threshold: 1,
  });
  assert.equal(result.curve.length, 33);
  for (const point of result.curve) {
    assert.ok(point.total <= 66);
    assert.ok(point.funding >= 0);
    assert.equal(point.sp.at, 32);
  }
  assert.throws(
    () =>
      sweep({ team: attacker, opponent: defender, stat: "hp", funding: "hp" }),
    /different/,
  );
});
test("tournament denominator excludes missing sheets and deduplicates within teams", () => {
  const u = tournamentUsage([
    {
      players: [
        { decklist: [{ name: "Garchomp" }, { name: "Garchomp" }] },
        { decklist: [] },
        { decklist: [{ name: "Rillaboom" }] },
      ],
    },
  ]);
  assert.equal(u.teamCount, 2);
  assert.equal(u.entries, 3);
  assert.equal(u.usage.Garchomp.percent, 50);
});
test("in-game marginal distributions stay estimated and retain raw coverage", () => {
  const sets = ladderSets({
    is_champions_game: true,
    selected_pokemon: "Garchomp",
    spreads_list: [
      ["2/32/0/0/0/32", "25"],
      ["32/32/32/32/32/32", "10"],
    ],
    items_list: [["Life Orb", "50"]],
    abilities_list: [["Rough Skin", "90"]],
    natures_list: [["Jolly", "60"]],
    moves_list: [["Dragon Claw", "80"]],
  });
  assert.equal(sets.length, 1);
  assert.equal(sets[0].weight, 25);
  assert.equal(sets[0].kind, "estimated");
  assert.throws(() => ladderSets({ is_champions_game: false }), /in-game/);
});
test("URL imports reject unrelated hosts and local-network URLs", async () => {
  await assert.rejects(pasteFromUrl("http://127.0.0.1:8080/"), /public https/);
  await assert.rejects(
    pasteFromUrl("https://pokepast.es.evil.example/123456789abcdef0"),
    /public https/,
  );
});
test("weighted matrix never includes published sets as usage observations", () => {
  const sets = [
    { ...defender, id: "a", kind: "estimated", weight: 25 },
    { ...defender, id: "b", kind: "published", weight: null },
  ];
  const [row] = analyze([attacker], [{ species: "Rillaboom", sets }]);
  assert.equal(row.cells[0].coverage, 25);
  assert.equal(row.cells[0].details.length, 1);
});
