export function opponentDanger(row) {
  const targets = row.cells.filter(
    (c) => c.incoming?.ko != null && c.incoming.ko > 0.5,
  );
  return {
    kos: targets.length,
    first: targets.reduce((sum, c) => sum + (c.pace?.opponent || 0), 0),
    speed: Math.max(0, ...targets.map((c) => c.speedRange?.opponent?.[1] || 0)),
  };
}
export function compareOpponentDanger(a, b) {
  const x = opponentDanger(a),
    y = opponentDanger(b);
  return (
    y.kos - x.kos ||
    y.first - x.first ||
    y.speed - x.speed ||
    (b.usage || 0) - (a.usage || 0)
  );
}
export function isCoverageGap(row, mode) {
  return !row.cells.some(
    (c) =>
      (mode === "incoming" ? c.survive : c.ko) != null &&
      (mode === "incoming" ? c.survive : c.ko) >= 0.95,
  );
}
