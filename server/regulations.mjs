import { load } from "cheerio";
import { METAGAMES } from "../shared/metagames.mjs";

export const NEWS_INDEX =
  "https://champions-news.pokemon-home.com/en/json/list.json";
export const SHEET = "1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw";
export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET}/edit`;

export function parseRegulation(html, source) {
  const $ = load(html);
  const format = $(".article-title")
    .text()
    .match(/Regulation Set (M-[A-Z]+)/)?.[1];
  const text = $(".article-body").text().replace(/\s+/g, " ");
  const dates = [
    ...text.matchAll(/([A-Z][a-z]+ \d{1,2}, 20\d{2}),? at (\d{2}:\d{2}) UTC/g),
  ].slice(0, 2);
  if (!format || dates.length !== 2)
    throw new Error("Official regulation duration could not be read.");
  const start = Date.parse(`${dates[0][1]} ${dates[0][2]} UTC`);
  // Official end timestamps are inclusive to the minute.
  const end = Date.parse(`${dates[1][1]} ${dates[1][2]} UTC`) + 60000;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error("Invalid official regulation dates.");
  return {
    format,
    start: new Date(start).toISOString().slice(0, 10),
    end: new Date(end).toISOString().slice(0, 10),
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
    source,
  };
}

export function parsePublishedTabs(html) {
  const $ = load(html),
    tabs = {};
  $(".docs-sheet-tab-caption").each((_, el) => {
    const title = $(el).text().trim();
    const format = title.match(/^Champions (M-[A-Z]+)$/)?.[1];
    if (format) tabs[format] = title;
  });
  if (!Object.keys(tabs).length)
    throw new Error("Published-team tab list could not be read.");
  return tabs;
}

export function activeRegulation(regulations, now = Date.now()) {
  return (
    Object.entries(regulations)
      .filter(
        ([, r]) =>
          Date.parse(r.startsAt || `${r.start}T02:00:00Z`) <= now &&
          now < Date.parse(r.endsAt || `${r.end}T02:00:00Z`),
      )
      .sort((a, b) => b[1].start.localeCompare(a[1].start))[0]?.[0] || null
  );
}

export async function discoverRegulations(
  fetchSource,
  previous = METAGAMES,
  now = Date.now(),
) {
  const regulations = structuredClone(previous),
    warnings = [],
    health = [];
  const record = (name, raw) => {
    health.push({ name, url: raw.url, fetchedAt: raw.at, stale: raw.stale });
    if (raw.stale)
      warnings.push(
        `${name}: using cached discovery data; ${raw.error || "source offline"}`,
      );
  };
  const results = await Promise.allSettled([
    fetchSource(NEWS_INDEX, { force: true }),
    fetchSource(SHEET_URL, { force: true }),
  ]);
  if (results[0].status === "fulfilled") {
    const raw = results[0].value;
    record("Official regulation news", raw);
    try {
      const json = JSON.parse(raw.text);
      if (!Array.isArray(json.data))
        throw new Error("Official news index schema changed.");
      const articles = json.data
        .filter(
          (x) =>
            /^Regulation Set M-[A-Z]+\b/.test(x.title) &&
            Number(x.stAt) * 1000 <= now,
        )
        .sort((a, b) => Number(b.pubAt) - Number(a.pubAt));
      const seen = new Set();
      for (const article of articles) {
        const name = article.title.match(/M-[A-Z]+/)[0];
        if (seen.has(name)) continue;
        const url = new URL(
          article.link,
          NEWS_INDEX.replace("json/list.json", ""),
        );
        if (
          url.origin !== new URL(NEWS_INDEX).origin ||
          !/^\/en\/page\/\d+\.html$/.test(url.pathname)
        )
          continue;
        try {
          const page = await fetchSource(url.href, { force: true });
          const parsed = parseRegulation(page.text, url.href);
          if (parsed.format !== name)
            throw new Error("Regulation title mismatch.");
          regulations[name] = { ...regulations[name], ...parsed };
          seen.add(name);
          record(`Official ${name} rules`, page);
        } catch (e) {
          warnings.push(`${name}: ${e.message}`);
        }
      }
      if (!seen.size)
        warnings.push(
          "No dated official regulations discovered; retaining known rules.",
        );
    } catch (e) {
      warnings.push(e.message);
    }
  } else
    warnings.push(
      `Official regulation discovery: ${results[0].reason.message}`,
    );
  if (results[1].status === "fulfilled") {
    const raw = results[1].value;
    record("Published-team tab discovery", raw);
    try {
      for (const [format, sheet] of Object.entries(
        parsePublishedTabs(raw.text),
      )) {
        // A sheet tab alone never establishes regulation dates.
        if (regulations[format]) regulations[format].sheet = sheet;
      }
    } catch (e) {
      warnings.push(e.message);
    }
  } else
    warnings.push(`Published-team discovery: ${results[1].reason.message}`);
  const latest = activeRegulation(regulations, now);
  if (!latest)
    warnings.push(
      "No confirmed regulation covers today. Keeping your previous selection until official dates are available.",
    );
  return {
    regulations,
    latest,
    warnings,
    health,
    checkedAt: new Date(now).toISOString(),
  };
}
