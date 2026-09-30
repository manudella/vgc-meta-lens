import test from "node:test";
import assert from "node:assert/strict";
import { calculatePair, validateSet } from "../server/engine.mjs";
import { displayedStage, resetBattleState } from "../shared/battle-state.mjs";
const chomp = {
  species: "Garchomp",
  ability: "Rough Skin",
  nature: "Jolly",
  sp: { at: 32, sp: 32 },
  moves: ["Dragon Claw"],
};
const incin = {
  species: "Incineroar",
  ability: "Intimidate",
  nature: "Careful",
  sp: { hp: 32 },
  moves: ["Flare Blitz"],
};
test("automatic Intimidate is the editable stage; final edits affect actual damage exactly once", () => {
  const auto = calculatePair(chomp, incin);
  assert.equal(displayedStage(chomp, auto.teamStats, "at"), -1);
  const edited = { ...chomp, stageOverrides: { at: 0 } };
  const neutral = calculatePair(edited, incin);
  const without = calculatePair(chomp, incin, { autoIntimidate: false });
  assert.equal(neutral.teamStats.boosts.at, 0);
  assert.equal(neutral.teamStats.automaticBoosts.at, -1);
  assert.deepEqual(neutral.outgoing[0].rolls, without.outgoing[0].rolls);
  assert.ok(neutral.outgoing[0].minPercent > auto.outgoing[0].minPercent);
  assert.equal(
    displayedStage(edited, auto.teamStats, "at"),
    0,
    "pending response must not hide a new edit",
  );
  assert.deepEqual(
    calculatePair(edited, incin),
    neutral,
    "recalculation does not accumulate Intimidate",
  );
  assert.equal(
    calculatePair(resetBattleState(edited), incin).teamStats.boosts.at,
    -1,
  );
});
test("final-stage overrides cover both boundaries, speed, and opponent state", () => {
  for (const stage of [-6, 6]) {
    const result = calculatePair(
      { ...chomp, stageOverrides: { at: stage, sp: stage } },
      { ...incin, stageOverrides: { df: stage } },
    );
    assert.equal(result.teamStats.boosts.at, stage);
    assert.equal(result.teamStats.boosts.sp, stage);
    assert.equal(result.opponentStats.boosts.df, stage);
  }
  const low = calculatePair({ ...chomp, stageOverrides: { sp: -6 } }, incin);
  assert.ok(low.teamStats.sp < low.opponentStats.sp);
  assert.throws(
    () => validateSet({ ...chomp, stageOverrides: { at: 7 } }),
    /Final stat stages/,
  );
  assert.throws(
    () => validateSet({ ...chomp, stageOverrides: { hp: 1 } }),
    /Final stat stages/,
  );
});
test("prevention and Defiant remain automatic unless the stage is explicitly overridden", () => {
  const clear = calculatePair({ ...chomp, ability: "Clear Body" }, incin);
  assert.equal(displayedStage(chomp, clear.teamStats, "at"), 0);
  const king = {
    ...chomp,
    species: "Kingambit",
    ability: "Defiant",
    moves: ["Kowtow Cleave"],
  };
  assert.equal(calculatePair(king, incin).teamStats.boosts.at, 1);
  assert.equal(
    calculatePair({ ...king, stageOverrides: { at: 2 } }, incin).teamStats
      .boosts.at,
    2,
  );
  assert.equal(
    calculatePair(chomp, incin, { autoIntimidate: false }).teamStats.boosts.at,
    0,
  );
});
