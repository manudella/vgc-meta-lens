import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { load } from "cheerio";
import { parse } from "csv-parse/sync";
import { STATS, baseName, speciesName, validateSet } from "./engine.mjs";
import { parsePaste } from "./paste.mjs";

const cacheDir = new URL("../.cache/", import.meta.url);
const SHEET = "1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw";
export const sourceLinks = {
  ladder: "https://www.munchstats.com/champions/doubles/Rillaboom",
  events: "https://pokedata.ovh/standingsVGC",
  teams: `https://docs.google.com/spreadsheets/d/${SHEET}/edit`,
};
export async function cachedFetch(
  url,
  { ttl = 24 * 3600 * 1000, force = false } = {},
) {
  await fs.mkdir(cacheDir, { recursive: true });
  const file = new URL(
    crypto.createHash("sha256").update(url).digest("hex") + ".json",
    cacheDir,
  );
  let cached;
  try {
    cached = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {}
  if (!force && cached && Date.now() - cached.at < ttl)
    return { ...cached, cache: true, stale: false };
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent":
          "VGC-Meta-Lens/0.1 (local research app; cached public data)",
      },
    });
    if (!response.ok)
      throw new Error(`${new URL(url).hostname}: HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > 25_000_000) throw new Error("Source response too large.");
    const result = { text, at: Date.now(), url };
    await fs.writeFile(file, JSON.stringify(result));
    return { ...result, cache: false, stale: false };
  } catch (e) {
    if (cached)
      return { ...cached, cache: true, stale: true, error: e.message };
    throw e;
  }
}
export async function pasteFromUrl(url) {
  const match = String(url).match(
    /^https:\/\/pokepast\.es\/([a-f0-9]{16})\/?(?:\/raw)?$/i,
  );
  if (!match)
    throw new Error("Use a public https://pokepast.es/<16-character-id> URL.");
  const raw = await cachedFetch(`https://pokepast.es/${match[1]}/raw`, {
    ttl: 30 * 24 * 3600 * 1000,
  });
  return raw.text;
}
export async function getEvents() {
  const raw = await cachedFetch(sourceLinks.events);
  const $ = load(raw.text);
  return $("button")
    .toArray()
    .map((el) => ({
      id: ($(el).attr("onclick") || "").match(/(\d{7})/)?.[1],
      name: $(el).text().replace(/\s+/g, " ").trim(),
    }))
    .filter((x) => x.id)
    .slice(0, 30);
}
export function tournamentUsage(events) {
  const counts = new Map();
  let teamCount = 0,
    entries = 0;
  for (const event of events) {
    entries += event.players.length;
    for (const player of event.players) {
      if (!Array.isArray(player.decklist) || !player.decklist.length) continue;
      teamCount++;
      const species = new Set(
        player.decklist.map((p) => baseName(speciesName(p.name) || p.name)),
      );
      for (const name of species) counts.set(name, (counts.get(name) || 0) + 1);
    }
  }
  return {
    teamCount,
    entries,
    usage: Object.fromEntries(
      [...counts].map(([name, count]) => [
        name,
        { count, percent: (count / teamCount) * 100 },
      ]),
    ),
  };
}
export function ladderSets(data, spreadLimit = 8) {
  if (!data.is_champions_game)
    throw new Error(
      "Source did not identify itself as Champions in-game data.",
    );
  const species = speciesName(data.selected_pokemon);
  if (!species) return [];
  return data.spreads_list
    .slice(0, spreadLimit)
    .flatMap(([spread, weight], i) => {
      const values = spread.split("/").map(Number);
      if (values.length !== 6) return [];
      const set = {
        id: `ladder-${i}`,
        species,
        item: data.items_list[0]?.[0] || "",
        ability: data.abilities_list[0]?.[0] || "",
        nature: data.natures_list[0]?.[0] || "Hardy",
        sp: Object.fromEntries(STATS.map((k, j) => [k, values[j]])),
        moves: data.moves_list.slice(0, 4).map((x) => x[0]),
        weight: Number(weight),
        kind: "estimated",
        label: `In-game spread ${i + 1}`,
        source: `https://www.munchstats.com/champions/doubles/${encodeURIComponent(data.selected_pokemon)}`,
        spreadKnown: true,
      };
      try {
        validateSet(set);
        return [set];
      } catch {
        return [];
      }
    });
}
export async function getPublished(format = "M-C") {
  const gid = format === "M-B" ? "1458357160" : "2001945654";
  const result = await cachedFetch(
    `https://docs.google.com/spreadsheets/d/${SHEET}/export?format=csv&gid=${gid}`,
  );
  const rows = parse(result.text, { relax_column_count: true, bom: true });
  const header = rows.findIndex((row) => row[0] === "Team ID");
  if (header < 0) throw new Error("VGCPastes sheet header changed.");
  const h = rows[header],
    ix = (label) => h.indexOf(label);
  const teams = rows
    .slice(header + 1)
    .filter((row) => /^M[BC]\d+$/.test(row[0]))
    .map((row) => ({
      id: row[0],
      title: row[1],
      url: row[ix("Pokepaste")],
      hasSpread: row[ix("EVs")] === "Yes",
      date: row[ix("Date Shared")],
      event: row[ix("Tournament / Event")],
      placing: row[ix("Rank")],
      owner: row[ix("Full Name")],
    }))
    .filter((t) => /^https:\/\/pokepast\.es\/[a-f0-9]{16}$/.test(t.url));
  return {
    teams,
    source: `${sourceLinks.teams}?gid=${gid}`,
    stale: result.stale,
    at: result.at,
  };
}
export const state = {
  running: false,
  progress: "",
  done: 0,
  total: 0,
  data: null,
  error: null,
};
export async function restore() {
  try {
    state.data = JSON.parse(
      await fs.readFile(new URL("dataset.json", cacheDir), "utf8"),
    );
  } catch {}
}
export async function refresh({
  format = "M-C",
  eventIds,
  limit = 40,
  spreadLimit = 8,
  publishedLimit = 24,
} = {}) {
  if (state.running) return;
  if (!["M-B", "M-C"].includes(format)) throw new Error("Choose M-B or M-C.");
  if (![20, 40, 80, 1000].includes(Number(limit)))
    throw new Error("Invalid coverage limit.");
  if (
    ![8, 16, 1000].includes(Number(spreadLimit)) ||
    ![24, 100, 1000].includes(Number(publishedLimit))
  )
    throw new Error("Invalid set sample limits.");
  if (
    eventIds &&
    (!Array.isArray(eventIds) ||
      eventIds.length > 8 ||
      eventIds.some((x) => !/^\d{7}$/.test(x)))
  )
    throw new Error("Select up to eight valid events.");
  state.running = true;
  state.error = null;
  state.done = 0;
  state.progress = "Discovering public sources";
  const warnings = [],
    health = [];
  try {
    let events = [];
    try {
      events = await getEvents();
    } catch (e) {
      warnings.push(`Event discovery unavailable: ${e.message}`);
    }
    // Regulation-era boundaries are explicit; users can override the event selection.
    const defaultIds = events
      .filter((e) =>
        format === "M-C"
          ? Number(e.id) >= 192
          : Number(e.id) >= 181 && Number(e.id) <= 191,
      )
      .slice(0, 3)
      .map((e) => e.id);
    const selected = eventIds || defaultIds;
    const tournaments = [];
    for (const id of selected) {
      try {
        const url = `https://pokedata.ovh/standingsVGC/${id}/masters/${id}_Masters.json`;
        const raw = await cachedFetch(url);
        const players = JSON.parse(raw.text);
        if (!Array.isArray(players))
          throw new Error("Unexpected tournament schema");
        tournaments.push({
          id,
          name: events.find((e) => e.id === id)?.name || id,
          url,
          players,
        });
        health.push({
          name: `Pokedata ${id}`,
          url,
          stale: raw.stale,
          fetchedAt: raw.at,
        });
      } catch (e) {
        warnings.push(e.message);
      }
    }
    const usage = tournamentUsage(tournaments);
    const seedRaw = await cachedFetch(
      "https://www.munchstats.com/api/championsdoubles/0/Rillaboom",
    );
    const seed = JSON.parse(seedRaw.text);
    if (!seed.is_champions_game || !Array.isArray(seed.pokemon_names))
      throw new Error("MunchStats in-game schema changed.");
    health.push({
      name: "MunchStats in-game doubles",
      url: sourceLinks.ladder,
      stale: seedRaw.stale,
      fetchedAt: seedRaw.at,
      capturedAt: seed.champions_updated,
    });
    const names = seed.pokemon_names
      .map(([name, rank]) => ({
        name,
        rank: Number(String(rank).replace("#", "")),
        usage:
          usage.usage[baseName(speciesName(name) || name)]?.percent ?? null,
      }))
      .filter((x) => speciesName(x.name));
    for (const name of Object.keys(usage.usage))
      if (
        !names.some((n) => baseName(speciesName(n.name) || n.name) === name) &&
        speciesName(name)
      )
        names.push({ name, rank: null, usage: usage.usage[name].percent });
    names.sort((a, b) =>
      usage.teamCount
        ? (b.usage || 0) - (a.usage || 0)
        : (a.rank || 999) - (b.rank || 999),
    );
    const targets = names.slice(0, Number(limit));
    state.total = targets.length;
    state.progress = "Reading in-game spreads";
    const threats = [];
    // Bounded concurrency, on-disk TTL, and small pauses keep requests modest.
    for (let i = 0; i < targets.length; i += 3) {
      const batch = await Promise.allSettled(
        targets.slice(i, i + 3).map(async (target) => {
          const raw =
            target.name === "Rillaboom"
              ? seedRaw
              : await cachedFetch(
                  `https://www.munchstats.com/api/championsdoubles/0/${encodeURIComponent(target.name)}`,
                );
          const d = JSON.parse(raw.text),
            sets = ladderSets(d, Number(spreadLimit));
          if (
            sets.length < Math.min(d.spreads_list.length, Number(spreadLimit))
          )
            warnings.push(
              `${target.name}: ${Math.min(d.spreads_list.length, Number(spreadLimit)) - sets.length} spreads could not be modeled with the current Champions engine.`,
            );
          if (raw.stale)
            warnings.push(`${target.name}: using stale cached in-game data.`);
          return {
            species: speciesName(target.name),
            sourceName: target.name,
            rank: target.rank,
            usage: target.usage,
            sets,
            distributions: {
              items: d.items_list,
              abilities: d.abilities_list,
              natures: d.natures_list,
              moves: d.moves_list,
              spreads: d.spreads_list,
            },
            capturedAt: d.champions_updated,
            spreadCoverage: sets.reduce((s, x) => s + x.weight, 0),
          };
        }),
      );
      for (const r of batch)
        if (r.status === "fulfilled") threats.push(r.value);
        else warnings.push(r.reason.message);
      state.done = Math.min(i + 3, targets.length);
      await new Promise((r) => setTimeout(r, 100));
    }
    state.progress = "Indexing published teams";
    let published = { teams: [] };
    try {
      published = await getPublished(format);
      health.push({
        name: "VGCPastes",
        url: published.source,
        stale: published.stale,
        fetchedAt: published.at,
      });
    } catch (e) {
      warnings.push(e.message);
    }
    let publishedLoaded = 0;
    for (const team of published.teams
      .filter((t) => t.hasSpread)
      .slice(0, Number(publishedLimit))) {
      try {
        const parsed = parsePaste(await pasteFromUrl(team.url), {
          allowMissing: true,
        });
        for (const [i, set] of parsed.entries()) {
          if (!set.spreadKnown) continue;
          const threat = threats.find(
            (t) => baseName(t.species) === baseName(set.species),
          );
          if (threat)
            threat.sets.push({
              ...set,
              id: `${team.id}-${i}`,
              kind: "published",
              label: team.title,
              source: team.url,
              weight: null,
            });
        }
        publishedLoaded++;
      } catch (e) {
        warnings.push(`${team.id}: ${e.message}`);
      }
    }
    if (format === "M-B")
      warnings.push(
        "In-game ladder data reflects the current season, not historical M-B. Published teams and tournament selection use M-B.",
      );
    const data = {
      version: 1,
      updatedAt: new Date().toISOString(),
      format,
      config: {
        format,
        eventIds: eventIds || null,
        limit: Number(limit),
        spreadLimit: Number(spreadLimit),
        publishedLimit: Number(publishedLimit),
      },
      threats,
      events,
      selectedEvents: tournaments.map(({ players, ...x }) => x),
      teamCount: usage.teamCount,
      entries: usage.entries,
      published: published.teams,
      publishedLoaded,
      health,
      warnings,
      requestedCount: targets.length,
      availableCount: names.length,
    };
    if (!threats.some((t) => t.sets.length))
      throw new Error(
        "No usable sets returned; preserving the previous dataset.",
      );
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(new URL("dataset.json", cacheDir), JSON.stringify(data));
    state.data = data;
  } catch (e) {
    state.error = e.message;
  } finally {
    state.running = false;
    state.progress = state.error ? "Refresh failed" : "Ready";
  }
}
