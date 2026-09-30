export function damageTone(damage, ko) {
  if (!damage) return "unknown";
  if (ko != null && ko > 0.5) return "lethal";
  return damage.maxPercent < 50
    ? "low"
    : damage.maxPercent <= 80
      ? "medium"
      : "high";
}
export function damageBar(damage) {
  const clamp = (n) => Math.max(0, Math.min(100, n));
  const min = clamp(damage?.minPercent || 0),
    max = clamp(damage?.maxPercent || 0);
  return {
    min,
    max,
    range: max - min,
    overflow: (damage?.maxPercent || 0) > 100,
  };
}
