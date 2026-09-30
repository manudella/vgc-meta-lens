import test from "node:test";
import assert from "node:assert/strict";
import { speciesName, calculatePair } from "../server/engine.mjs";
import { tournamentUsage } from "../server/sources.mjs";
import { exactThreats } from "../server/team-comparison.mjs";
import { analyze } from "../server/analysis.mjs";
import { damageTone, damageBar } from "../shared/damage-display.mjs";
import { spriteCandidates } from "../shared/sprites.mjs";
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
test("exact opponent rows use supplied moves and spreads, including duplicate species as distinct slots", () => {
  const opponents = [b, { ...b, sp: { df: 32, hp: 32, sp: 2 } }];
  const rows = analyze([a], exactThreats(opponents));
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].id, rows[1].id);
  for (let i = 0; i < 2; i++) {
    const pair = calculatePair(a, opponents[i]);
    assert.equal(rows[i].cells[0].out.minPercent, pair.outgoing[0].minPercent);
    assert.equal(rows[i].cells[0].ko, pair.outgoing[0].ko);
    assert.equal(rows[i].cells[0].survive, pair.incoming[0].survive);
    assert.equal(rows[i].cells[0].details.length, 1);
  }
  assert.notEqual(
    rows[0].cells[0].out.minPercent,
    rows[1].cells[0].out.minPercent,
  );
  assert.throws(() => exactThreats([]), /1–6/);
  assert.throws(() => exactThreats(Array(7).fill(b)), /1–6/);
});
test("Pokedata form counts match canonical aliases without merging meaningful gender or regional forms", () => {
  const result = tournamentUsage([
    {
      players: [
        {
          decklist: [
            { name: "Basculegion [Male]" },
            { name: "Basculegion" },
            { name: "Indeedee [Female]" },
            { name: "Arcanine [Hisuian Form]" },
          ],
        },
        {
          decklist: [
            { name: "Basculegion [Female]" },
            { name: "Indeedee [Male]" },
            { name: "Arcanine" },
          ],
        },
        { decklist: [] },
      ],
    },
  ]);
  assert.equal(result.teamCount, 2);
  for (const n of [
    "Basculegion",
    "Basculegion-F",
    "Indeedee",
    "Indeedee-F",
    "Arcanine",
    "Arcanine-Hisui",
  ])
    assert.equal(result.usage[n].percent, 50, n);
  assert.deepEqual(result.unmapped, {});
});
test("remaining observed tournament form labels map, unknown future forms are disclosed", () => {
  const forms = [
    "Meowstic [Female]",
    "Meowstic [Male]",
    "Floette [Eternal Flower]",
    "Sinistcha [Unremarkable Form]",
    "Sinistcha [Masterpiece Form]",
    "Maushold [Family of Three]",
    "Maushold [Family of Four]",
    "Tauros [Paldean Form - Aqua Breed]",
    "Goodra [Hisuian Form]",
    "Ninetales [Alolan Form]",
    "Rotom [Heat Rotom]",
    "Rotom [Wash Rotom]",
    "Rotom [Mow Rotom]",
    "Persian [Alolan Form]",
    "Typhlosion [Hisuian Form]",
    "Toxtricity [Amped Form]",
    "Toxtricity [Low Key Form]",
    "Lycanroc [Dusk Form]",
    "Zoroark [Hisuian Form]",
    "Avalugg [Hisuian Form]",
    "Raichu [Alolan Form]",
    "Decidueye [Hisuian Form]",
    "Squawkabilly [White Plumage]",
    "Samurott [Hisuian Form]",
    "Slowbro [Galarian Form]",
  ];
  for (const name of forms) assert.ok(speciesName(name), name);
  const u = tournamentUsage([
    { players: [{ decklist: [{ name: "Basculegion [Unknown Form]" }] }] },
  ]);
  assert.equal(u.teamCount, 1);
  assert.equal(u.unmapped["Basculegion [Unknown Form]"], 1);
  assert.deepEqual(u.usage, {});
});
test("damage color follows maximum roll independently of KO chance; bars cap at full HP", () => {
  for (const [max, tone] of [
    [0, "low"],
    [49.9, "low"],
    [50, "medium"],
    [80, "medium"],
    [80.1, "high"],
    [140, "high"],
  ])
    assert.equal(damageTone({ maxPercent: max }, 0.5), tone);
  assert.equal(damageTone({ maxPercent: 70 }, 0.50001), "medium");
  assert.equal(damageTone(null, null), "unknown");
  assert.deepEqual(damageBar({ minPercent: 25, maxPercent: 65 }), {
    min: 25,
    max: 65,
    range: 40,
    overflow: false,
  });
  assert.deepEqual(damageBar({ minPercent: 120, maxPercent: 150 }), {
    min: 100,
    max: 100,
    range: 0,
    overflow: true,
  });
});
test("missing Mega sprite replacements point to exact-form official artwork", () => {
  const ids = {
    Staraptor: 10308,
    Pyroar: 10295,
    Malamar: 10297,
    Scrafty: 10289,
    Dragalge: 10299,
    Eelektross: 10290,
    Scolipede: 10288,
    Falinks: 10303,
  };
  for (const [name, id] of Object.entries(ids))
    assert.ok(
      spriteCandidates(`Mega ${name}`)[0].endsWith(
        `/official-artwork/${id}.png`,
      ),
    );
});
