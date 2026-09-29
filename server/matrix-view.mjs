// Search always covers the loaded metagame, even outside the quick top-N view.
export function selectThreats(threats, { limit = 0, query = "" } = {}) {
  if (![0, 20, 40, 80].includes(limit))
    throw new Error("Choose top 20, 40, 80 or all threats.");
  if (typeof query !== "string" || query.length > 100)
    throw new Error("Use a species search of at most 100 characters.");
  const search = query.trim().toLowerCase();
  const ranked = [...threats].sort(
    (a, b) =>
      (b.usage || 0) - (a.usage || 0) || (a.rank || 999) - (b.rank || 999),
  );
  return search
    ? ranked.filter((r) => r.species.toLowerCase().includes(search))
    : limit
      ? ranked.slice(0, limit)
      : ranked;
}
