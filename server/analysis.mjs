import { calculatePair, STATS, validateSet } from "./engine.mjs";
const best = (arr) =>
  arr
    .filter((x) => !x.support)
    .sort(
      (a, b) => (b.ko ?? -1) - (a.ko ?? -1) || b.maxPercent - a.maxPercent,
    )[0] || null;
export function analyze(team, threats, options = {}) {
  if (!Array.isArray(team) || team.length < 1 || team.length > 6)
    throw new Error("Use 1–6 team members.");
  team.forEach(validateSet);
  const rows = threats.map((threat) => {
    const sets = threat.sets.filter(
      (s) => s.kind === "estimated" || (threat.exact && s.kind === "exact"),
    );
    return {
      ...threat,
      cells: team.map((member) => {
        const details = sets.map((set) => {
          try {
            const pair = calculatePair(member, set, options);
            return {
              setId: set.id,
              weight: set.weight,
              outgoingMoves: pair.outgoing,
              incomingMoves: pair.incoming,
              orders: pair.orders,
              speeds: [pair.teamStats.sp, pair.opponentStats.sp],
            };
          } catch (e) {
            return { setId: set.id, error: e.message, weight: set.weight };
          }
        });
        const valid = details.filter((d) => !d.error),
          total = valid.reduce((s, d) => s + d.weight, 0);
        const aggregate = (key) => {
          const names = [
            ...new Set(
              valid.flatMap((d) =>
                d[key].filter((m) => !m.support).map((m) => m.move),
              ),
            ),
          ];
          return names.map((move) => {
            const samples = valid.map((d) => ({
              weight: d.weight,
              result: d[key].find((m) => m.move === move),
            }));
            const usable = samples.filter((s) => s.result),
              known = usable.every((s) => s.result.ko !== null);
            return {
              move,
              support: false,
              ko:
                known && total
                  ? usable.reduce((s, x) => s + x.weight * x.result.ko, 0) /
                    total
                  : null,
              maxPercent: Math.max(...usable.map((s) => s.result.maxPercent)),
              minPercent: Math.min(...usable.map((s) => s.result.minPercent)),
            };
          });
        };
        const outgoingMoves = aggregate("outgoingMoves"),
          incomingMoves = aggregate("incomingMoves"),
          out = best(outgoingMoves),
          incoming = best(incomingMoves);
        const pace = {
          team: 0,
          opponent: 0,
          tie: 0,
          unknown: 0,
          blocked: 0,
          faster: 0,
          slower: 0,
          speedTie: 0,
        };
        for (const d of valid) {
          const order = d.orders.find(
            (o) =>
              o.teamMove === out?.move && o.opponentMove === incoming?.move,
          );
          if (order) {
            pace[order.first] += d.weight / total;
            pace[
              order.speed === "team"
                ? "faster"
                : order.speed === "opponent"
                  ? "slower"
                  : "speedTie"
            ] += d.weight / total;
          } else pace.unknown += d.weight / total;
        }
        return {
          details: details.map(
            ({ outgoingMoves, incomingMoves, orders, speeds, ...d }) => d,
          ),
          coverage: total,
          ko: out ? out.ko : total ? 0 : null,
          survive: incoming
            ? incoming.ko === null
              ? null
              : 1 - incoming.ko
            : total
              ? 1
              : null,
          out,
          incoming,
          outgoingMoves,
          incomingMoves,
          pace,
          speedRange: valid.length
            ? {
                team: [
                  Math.min(...valid.map((d) => d.speeds[0])),
                  Math.max(...valid.map((d) => d.speeds[0])),
                ],
                opponent: [
                  Math.min(...valid.map((d) => d.speeds[1])),
                  Math.max(...valid.map((d) => d.speeds[1])),
                ],
              }
            : null,
        };
      }),
    };
  });
  return rows;
}
export function sweep({
  team,
  opponent,
  options = {},
  stat = "at",
  funding = "sp",
  direction = "outgoing",
  move,
  threshold = 1,
}) {
  validateSet(team);
  validateSet(opponent);
  if (!STATS.includes(stat) || !STATS.includes(funding) || stat === funding)
    throw new Error("Choose different target and funding stats.");
  if (!["outgoing", "incoming"].includes(direction))
    throw new Error("Unknown sweep direction.");
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)
    throw new Error("Threshold must be between 0 and 1.");
  const total = STATS.reduce((s, k) => s + (team.sp[k] || 0), 0),
    base = team.sp[stat] || 0,
    available = 66 - total;
  const curve = [];
  for (let value = 0; value <= 32; value++) {
    const extra = Math.max(0, value - base - available),
      donor = (team.sp[funding] || 0) - extra;
    if (donor < 0) continue;
    const candidate = {
      ...team,
      sp: { ...team.sp, [stat]: value, [funding]: donor },
    };
    const calc = calculatePair(candidate, opponent, options)[direction].find(
      (c) => c.move === move,
    );
    if (!calc) throw new Error("Select a move for the sweep.");
    curve.push({
      value,
      funding: donor,
      total: STATS.reduce((s, k) => s + (candidate.sp[k] || 0), 0),
      chance: direction === "incoming" ? calc.survive : calc.ko,
      min: calc.minPercent,
      max: calc.maxPercent,
      sp: candidate.sp,
    });
  }
  return {
    curve,
    minimum:
      curve.find((x) => x.chance !== null && x.chance + 1e-9 >= threshold) ||
      null,
  };
}
