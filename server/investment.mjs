import { calculatePair, validateSet, STATS } from "./engine.mjs";
function allocate(set, fixed) {
  const sp = {
    ...Object.fromEntries(STATS.map((k) => [k, set.sp?.[k] || 0])),
    ...fixed,
  };
  const other = STATS.filter((k) => !(k in fixed)),
    budget = 66 - Object.values(fixed).reduce((a, b) => a + b, 0);
  const total = other.reduce((a, k) => a + sp[k], 0);
  if (total > budget) {
    const shares = other.map((k) => ({ k, exact: (sp[k] * budget) / total }));
    shares.forEach(({ k, exact }) => {
      sp[k] = Math.floor(exact);
    });
    let left = budget - other.reduce((a, k) => a + sp[k], 0);
    for (const { k } of shares.sort(
      (a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)),
    ))
      if (left-- > 0) sp[k]++;
  }
  return sp;
}
export function investment({
  team,
  opponent,
  options = {},
  direction = "outgoing",
  move,
  threshold = 1,
}) {
  validateSet(team);
  validateSet(opponent);
  if (
    !["outgoing", "incoming"].includes(direction) ||
    !Number.isFinite(threshold) ||
    threshold < 0 ||
    threshold > 1
  )
    throw new Error("Invalid investment target.");
  const initial = calculatePair(team, opponent, options)[direction].find(
    (m) => m.move === move,
  );
  if (!initial || initial.support) throw new Error("Choose a damaging move.");
  const special = initial.category === "Special";
  const stat =
    direction === "outgoing"
      ? move === "Body Press"
        ? "df"
        : special
          ? "sa"
          : "at"
      : ["Psyshock", "Psystrike", "Secret Sword"].includes(move)
        ? "df"
        : special
          ? "sd"
          : "df";
  const axes = direction === "incoming" ? [stat, "hp"] : [stat];
  const points = [];
  for (let x = 0; x <= 32; x++)
    for (let y = 0; y <= (axes.length === 2 ? 32 : 0); y++) {
      const fixed = { [stat]: x, ...(axes.length === 2 ? { hp: y } : {}) },
        sp = allocate(team, fixed);
      const result = calculatePair({ ...team, sp }, opponent, options)[
        direction
      ].find((m) => m.move === move);
      points.push({
        x,
        y,
        sp,
        cost: x + y,
        chance: direction === "incoming" ? result.survive : result.ko,
        min: result.minPercent,
        max: result.maxPercent,
        reallocated: STATS.filter(
          (k) => !(k in fixed) && sp[k] < (team.sp?.[k] || 0),
        ).reduce((n, k) => n + (team.sp[k] - sp[k]), 0),
      });
    }
  const meets = points
    .filter((p) => p.chance !== null && p.chance + 1e-9 >= threshold)
    .sort((a, b) => a.cost - b.cost || b.chance - a.chance || b.y - a.y);
  const cheapest = meets[0]?.cost;
  return {
    axes,
    points,
    minimum: meets[0] || null,
    alternatives: meets.filter((p) => p.cost === cheapest).slice(0, 8),
    note:
      move === "Foul Play"
        ? "Foul Play uses the opponent’s Attack; your Attack investment does not strengthen it."
        : "Remaining stats are preserved when possible, otherwise reduced proportionally to keep the 66-point budget. Inspect the full proposed spread before applying.",
  };
}
