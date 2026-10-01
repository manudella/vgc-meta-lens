// Official rules: champions-news.pokemon-home.com/en/page/{776,816}.html
export const METAGAMES = {
  "M-C": { start: "2026-09-09", end: "2026-12-02", gid: "2001945654" },
  "M-B": { start: "2026-06-17", end: "2026-09-09", gid: "1458357160" },
};
export const LATEST_METAGAME = "M-C";
export function eventDate(name) {
  const m = name.match(
    /[-–]\s*([A-Za-z]+)\s+(\d{1,2})(?:\s*[-–]\s*(?:[A-Za-z]+\s+)?\d{1,2})?,?\s+(20\d{2})/,
  );
  if (!m) return null;
  const time = Date.parse(`${m[1]} ${m[2]}, ${m[3]} 12:00:00 UTC`);
  return Number.isFinite(time)
    ? new Date(time).toISOString().slice(0, 10)
    : null;
}
export function eventMetagame(date, regulations = METAGAMES) {
  return (
    Object.entries(regulations).find(
      ([, rule]) => date && date >= rule.start && date < rule.end,
    )?.[0] || null
  );
}
export function metagameEvents(events, format) {
  return events.filter(
    (e) =>
      (e.metagame || eventMetagame(e.date || eventDate(e.name))) === format,
  );
}
