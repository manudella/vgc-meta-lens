import test from "node:test";
import assert from "node:assert/strict";
import { selectThreats } from "../server/matrix-view.mjs";

const threats = Array.from({ length: 45 }, (_, i) => ({
  species: i === 44 ? "Rare opponent" : `Threat ${i}`,
  usage: 45 - i,
  rank: i + 1,
}));
test("quick matrix view uses event usage; whole-meta search finds threats outside top 20", () => {
  const reversed = [...threats].reverse();
  assert.equal(selectThreats(reversed, { limit: 20 }).length, 20);
  assert.equal(selectThreats(reversed, { limit: 20 })[0].species, "Threat 0");
  assert.deepEqual(selectThreats(reversed, { limit: 20, query: " RARE " }), [
    threats[44],
  ]);
  assert.equal(selectThreats(reversed, { limit: 0 }).length, 45);
  assert.equal(reversed[0].species, "Rare opponent");
});
test("missing event usage falls back to game rank and invalid scope fails explicitly", () => {
  assert.equal(
    selectThreats([
      { species: "A", rank: 3 },
      { species: "B", rank: 1 },
    ])[0].species,
    "B",
  );
  assert.throws(() => selectThreats(threats, { limit: -1 }), /Choose top/);
  assert.throws(() => selectThreats(threats, { query: [] }), /species search/);
});
