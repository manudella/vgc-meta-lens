import test from "node:test";
import assert from "node:assert/strict";
import {
  opponentDanger,
  compareOpponentDanger,
  isCoverageGap,
} from "../shared/matrix-filters.mjs";
const cell = (ko, first = 0, speed = 100) => ({
  incoming: { ko },
  pace: { opponent: first },
  speedRange: { opponent: [speed, speed] },
});
test("opponent KO filter uses strictly above 50%, excludes unknown and respects each team slot", () => {
  assert.equal(
    opponentDanger({ cells: [cell(0.5), cell(null), cell(0.51), cell(1)] }).kos,
    2,
  );
});
test("opponent danger sorts by target count then move order then speed", () => {
  const more = { cells: [cell(0.7), cell(0.7)] };
  const quick = { cells: [cell(0.9, 1, 200)] };
  assert.ok(compareOpponentDanger(more, quick) < 0);
  const priority = { cells: [cell(0.8, 1, 50)] };
  const slowerOrder = { cells: [cell(0.8, 0, 200)] };
  assert.ok(compareOpponentDanger(priority, slowerOrder) < 0);
  assert.ok(compareOpponentDanger(quick, priority) < 0);
});
test("coverage gaps preserve the 95% offensive/defensive definitions and unknown handling", () => {
  const row = {
    cells: [
      { ko: 0.95, survive: 0.8 },
      { ko: null, survive: null },
    ],
  };
  assert.equal(isCoverageGap(row, "both"), false);
  assert.equal(isCoverageGap(row, "outgoing"), false);
  assert.equal(isCoverageGap(row, "incoming"), true);
  assert.equal(
    isCoverageGap({ cells: [{ ko: null, survive: null }] }, "both"),
    true,
  );
});
