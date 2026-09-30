import test from "node:test";
import assert from "node:assert/strict";
import { parsePaste } from "../server/paste.mjs";
import { calculatePair } from "../server/engine.mjs";
import { investment } from "../server/investment.mjs";
import { eventDate, metagameEvents } from "../shared/metagames.mjs";
import { spriteId, spriteCandidates } from "../shared/sprites.mjs";
const a = {
  species: "Garchomp",
  ability: "Rough Skin",
  nature: "Jolly",
  sp: { at: 32, sp: 32, hp: 2 },
  moves: ["Dragon Claw"],
};
const b = {
  species: "Rillaboom",
  ability: "Overgrow",
  nature: "Adamant",
  sp: { hp: 32, at: 32, sp: 2 },
  moves: ["Wood Hammer"],
};
test("published Champions EV-labeled points are preserved, traditional EVs still convert", () => {
  const raw =
    "Dragonite @ Dragoninite\nAbility: Multiscale\nEVs: 2 HP / 32 SpA / 32 Spe\nModest Nature\n- Dragon Pulse";
  const [set] = parsePaste(raw);
  assert.deepEqual(set.sp, { hp: 2, at: 0, df: 0, sa: 32, sd: 0, sp: 32 });
  assert.equal(set.spreadEncoding, "Champions SP");
  assert.equal(
    parsePaste(raw.replace("Modest Nature", "modest nature"))[0].nature,
    "Modest",
  );
  assert.equal(parsePaste(raw, { spreadFormat: "ev" })[0].sp.sa, 4);
  assert.equal(
    parsePaste(
      raw.replace("2 HP / 32 SpA / 32 Spe", "4 HP / 252 SpA / 252 Spe"),
    )[0].sp.sa,
    32,
  );
});
test("automatic Expanding Force assumes Psychic Terrain when no setter is present; None overrides it", () => {
  const user = {
    ...a,
    species: "Alakazam",
    ability: "Magic Guard",
    moves: ["Expanding Force"],
  };
  const auto = calculatePair(user, b);
  const explicit = calculatePair(user, b, { terrain: "Psychic" });
  const none = calculatePair(user, b, { terrain: "" });
  assert.equal(auto.terrain, "Psychic");
  assert.deepEqual(auto.outgoing[0].rolls, explicit.outgoing[0].rolls);
  assert.ok(auto.outgoing[0].minPercent > none.outgoing[0].minPercent);
  assert.equal(
    calculatePair(user, b, { autoMoveConditions: false }).terrain,
    "",
  );
});
test("investment automatically scans Attack and all HP/Defense combinations with valid spreads", () => {
  const offense = investment({ team: a, opponent: b, move: "Dragon Claw" });
  assert.deepEqual(offense.axes, ["at"]);
  assert.equal(offense.points.length, 33);
  const defense = investment({
    team: a,
    opponent: b,
    direction: "incoming",
    move: "Wood Hammer",
    threshold: 0.5,
  });
  assert.deepEqual(defense.axes, ["df", "hp"]);
  assert.equal(defense.points.length, 1089);
  for (const p of defense.points) {
    assert.ok(Object.values(p.sp).reduce((s, v) => s + v, 0) <= 66);
    assert.equal(p.sp.df, p.x);
    assert.equal(p.sp.hp, p.y);
  }
  if (defense.minimum) {
    assert.ok(defense.minimum.chance >= 0.5);
    assert.ok(
      !defense.points.some(
        (p) => p.chance >= 0.5 && p.cost < defense.minimum.cost,
      ),
    );
    assert.equal(
      calculatePair({ ...a, sp: defense.minimum.sp }, b).incoming[0].survive,
      defense.minimum.chance,
    );
  }
});
test("events use regulation dates and do not truncate at three tournaments", () => {
  assert.equal(
    eventDate("2027 Frankfurt Regional - September 26-27, 2026"),
    "2026-09-26",
  );
  const events = Array.from({ length: 12 }, (_, i) => ({
    id: String(i),
    name: `Regional - September ${10 + i}, 2026`,
  }));
  events.push({ id: "old", name: "Regional - June 12-14, 2026" });
  assert.equal(metagameEvents(events, "M-C").length, 12);
  assert.equal(metagameEvents(events, "M-B").length, 0);
});
test("Kommo-o and Mega Raichu Y use exact-form assets, never normal Raichu", () => {
  assert.equal(spriteId("Kommo-o"), "kommoo");
  assert.match(spriteCandidates("Mega Raichu Y")[0], /mega_raichu_y_square/);
  assert.ok(
    spriteCandidates("Mega Raichu Y").every(
      (url) => !url.endsWith("/raichu.png"),
    ),
  );
});
