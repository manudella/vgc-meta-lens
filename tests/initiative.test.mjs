import test from "node:test";
import assert from "node:assert/strict";
import { calculatePair } from "../server/engine.mjs";
import { attackOrder } from "../server/initiative.mjs";
const set = (species, move, extra = {}) => ({
  species,
  item: "",
  ability: "",
  nature: "Hardy",
  sp: { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
  moves: [move],
  ...extra,
});
test("normal priority uses effective speed; Trick Room reverses within the bracket", () => {
  const fast = set("Garchomp", "Dragon Claw"),
    slow = set("Incineroar", "Flare Blitz", { ability: "Blaze" });
  assert.equal(calculatePair(fast, slow).orders[0].first, "team");
  const reversed = calculatePair(fast, slow, { trickRoom: true }).orders[0];
  assert.equal(reversed.speed, "team");
  assert.equal(reversed.first, "opponent");
});
test("Fake Out outruns normal moves even in Trick Room", () => {
  const a = set("Incineroar", "Fake Out", { ability: "Blaze" }),
    b = set("Garchomp", "Dragon Claw");
  for (const trickRoom of [false, true]) {
    const r = calculatePair(a, b, { trickRoom });
    assert.equal(r.outgoing[0].priority, 3);
    assert.equal(r.orders[0].first, "team");
  }
});
test("protect priority outruns Fake Out; Trick Room move itself has -7 priority", () => {
  assert.equal(
    calculatePair(set("Garchomp", "Protect"), set("Incineroar", "Fake Out"))
      .orders[0].first,
    "team",
  );
  const r = calculatePair(
    set("Farigiraf", "Trick Room"),
    set("Garchomp", "Dragon Claw"),
  );
  assert.equal(r.outgoing[0].priority, -7);
  assert.equal(r.orders[0].first, "opponent");
});
test("Grassy Glide gets priority only on Grassy Terrain, with automatic surge", () => {
  const a = set("Rillaboom", "Grassy Glide", { ability: "Grassy Surge" }),
    b = set("Garchomp", "Dragon Claw");
  const auto = calculatePair(a, b);
  assert.equal(auto.terrain, "Grassy");
  assert.equal(auto.outgoing[0].priority, 1);
  assert.equal(auto.orders[0].first, "team");
  const clear = calculatePair(a, b, { terrain: "" });
  assert.equal(clear.outgoing[0].priority, 0);
  assert.equal(clear.orders[0].first, "opponent");
});
test("Prankster, Gale Wings and priority blocking are visible", () => {
  assert.equal(
    calculatePair(
      set("Whimsicott", "Tailwind", { ability: "Prankster" }),
      set("Garchomp", "Protect"),
    ).outgoing[0].priority,
    1,
  );
  const talon = set("Talonflame", "Brave Bird", { ability: "Gale Wings" });
  assert.equal(
    calculatePair(talon, set("Garchomp", "Dragon Claw")).outgoing[0].priority,
    1,
  );
  assert.equal(
    calculatePair({ ...talon, hpPercent: 99 }, set("Garchomp", "Dragon Claw"))
      .outgoing[0].priority,
    0,
  );
  const blocked = calculatePair(
    set("Incineroar", "Fake Out"),
    set("Indeedee-F", "Psychic", { ability: "Psychic Surge" }),
  );
  assert.match(blocked.outgoing[0].blocked, /Psychic/);
  assert.equal(blocked.orders[0].first, "blocked");
});
test("Tailwind and paralysis feed into the same effective-speed comparison", () => {
  const a = set("Incineroar", "Flare Blitz", { ability: "Blaze" }),
    b = set("Garchomp", "Dragon Claw");
  assert.equal(calculatePair(a, b).orders[0].first, "opponent");
  assert.equal(
    calculatePair(a, b, { team: { tailwind: true } }).orders[0].first,
    "team",
  );
  assert.equal(
    calculatePair(a, { ...b, status: "Paralyzed" }).orders[0].first,
    "team",
  );
});
test("speed ties and Quick Claw are explicitly uncertain", () => {
  const a = set("Garchomp", "Dragon Claw");
  assert.equal(calculatePair(a, a).orders[0].first, "tie");
  assert.equal(
    calculatePair({ ...a, item: "Quick Claw" }, set("Rillaboom", "Wood Hammer"))
      .orders[0].first,
    "unknown",
  );
});
test("auto Intimidate honors prevention abilities, legal-item scope and manual override", () => {
  const source = set("Incineroar", "Flare Blitz", { ability: "Intimidate" }),
    target = set("Dragonite", "Dragon Claw", { ability: "Multiscale" });
  assert.equal(calculatePair(target, source).teamStats.boosts.at, -1);
  assert.throws(
    () => calculatePair({ ...target, item: "Clear Amulet" }, source),
    /Unsupported Champions item/,
  );
  assert.equal(
    calculatePair(
      { ...target, species: "Metagross", ability: "Clear Body" },
      source,
    ).teamStats.boosts.at,
    0,
  );
  assert.equal(
    calculatePair({ ...target, ability: "Inner Focus" }, source).teamStats
      .boosts.at,
    0,
  );
  assert.equal(
    calculatePair(target, source, { autoIntimidate: false }).teamStats.boosts
      .at,
    0,
  );
  assert.equal(
    calculatePair({ ...target, boosts: { at: 2 } }, source).teamStats.boosts.at,
    1,
  );
});
test("automatic Mega ability weather can be overridden without altering the set", () => {
  const a = set("Charizard", "Flamethrower", {
      item: "Charizardite Y",
      ability: "Blaze",
    }),
    b = set("Rillaboom", "Wood Hammer", { ability: "Overgrow" });
  assert.equal(calculatePair(a, b).weather, "Sun");
  assert.equal(calculatePair(a, b, { weather: "Rain" }).weather, "Rain");
  assert.equal(calculatePair({ ...a, mega: false }, b).weather, "");
  assert.equal(
    calculatePair({ ...a, species: "Mega Charizard Y", mega: false }, b)
      .teamStats.name,
    "Charizard",
  );
});
test("Trick Room preserves cartridge inversion at extreme speed", () => {
  const common = {
    teamMove: { move: "Tackle", priority: 0 },
    opponentMove: { move: "Tackle", priority: 0 },
    trickRoom: true,
  };
  assert.equal(
    attackOrder({ ...common, teamSpeed: 2000, opponentSpeed: 100 }).first,
    "team",
  );
});
