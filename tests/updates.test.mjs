import test from "node:test";
import assert from "node:assert/strict";
import {
  parseRegulation,
  parsePublishedTabs,
  activeRegulation,
  discoverRegulations,
  NEWS_INDEX,
  SHEET_URL,
} from "../server/regulations.mjs";
import { eventDate, eventMetagame } from "../shared/metagames.mjs";
import {
  startAutoRefresh,
  REFRESH_INTERVAL,
  RETRY_INTERVAL,
} from "../server/auto-refresh.mjs";
import { publishedTeamsFromCsv } from "../server/sources.mjs";
import { speciesName } from "../server/engine.mjs";

test("default-form ladder names remain supported while unknown species stay explicit", () => {
  assert.equal(speciesName("Lycanroc"), "Lycanroc-Midday");
  assert.equal(speciesName("Gourgeist"), "Gourgeist-Average");
  assert.equal(speciesName("Fenann"), undefined);
});

const rule = (name, start, end) =>
  `<div class="article-title">Regulation Set ${name}</div><div class="article-body">Regulation Set ${name} Duration ${start}, at 02:00 UTC to ${end}, at 01:59 UTC</div>`;
test("official dates gate a future regulation to its exact start minute", () => {
  const d = parseRegulation(
    rule("M-D", "December 2, 2026", "March 3, 2027"),
    "official",
  );
  const regs = { "M-D": d };
  assert.equal(
    activeRegulation(regs, Date.parse("2026-12-02T01:59:59Z")),
    null,
  );
  assert.equal(
    activeRegulation(regs, Date.parse("2026-12-02T02:00:00Z")),
    "M-D",
  );
  assert.equal(
    activeRegulation(regs, Date.parse("2027-03-03T02:00:00Z")),
    null,
  );
  assert.equal(eventMetagame("2027-01-02", regs), "M-D");
  assert.throws(
    () =>
      parseRegulation('<div class="article-title">Regulation Set M-D</div>'),
    /duration/,
  );
});
test("new tabs are discovered without mistaking featured teams for the full repository", () => {
  assert.deepEqual(
    parsePublishedTabs(
      '<div class="docs-sheet-tab-caption">Champions M-D</div><div class="docs-sheet-tab-caption">Champions M-D Featured Teams</div>',
    ),
    { "M-D": "Champions M-D" },
  );
  assert.throws(() => parsePublishedTabs("Layout changed"), /tab list/);
  const csv =
    "Team ID,Team Description,Pokepaste,EVs\nMD1,New team,https://pokepast.es/1234567890abcdef,Yes";
  assert.equal(publishedTeamsFromCsv(csv)[0].id, "MD1");
});
test("discovery learns a new regulation and its sheet, with safe offline fallback", async () => {
  const fixtures = {
    [NEWS_INDEX]: JSON.stringify({
      data: [{ title: "Regulation Set M-D", stAt: 1, link: "page/900.html" }],
    }),
    [SHEET_URL]: '<div class="docs-sheet-tab-caption">Champions M-D</div>',
    "https://champions-news.pokemon-home.com/en/page/900.html": rule(
      "M-D",
      "December 2, 2026",
      "March 3, 2027",
    ),
  };
  const now = Date.parse("2026-12-03T00:00:00Z");
  const discovered = await discoverRegulations(
    async (url) => ({ text: fixtures[url], at: now, url }),
    {},
    now,
  );
  assert.equal(discovered.latest, "M-D");
  assert.equal(discovered.regulations["M-D"].sheet, "Champions M-D");
  const offline = await discoverRegulations(
    async () => {
      throw new Error("Offline");
    },
    discovered.regulations,
    now,
  );
  assert.equal(offline.latest, "M-D");
  assert.equal(offline.warnings.length, 2);
});
test("cross-month tournaments retain their start date for era selection", () => {
  assert.equal(
    eventDate("Regional - September 30–October 1, 2026"),
    "2026-09-30",
  );
});
test("automatic checks run on launch, repeat after six hours, preserve selections and never overlap", async () => {
  let now = 0,
    calls = 0,
    release;
  const config = { format: "M-B", followLatest: false, eventIds: ["1234567"] };
  const state = { data: { config }, running: false };
  const scheduler = startAutoRefresh({
    state,
    now: () => now,
    setTimer: () => 0,
    clearTimer: () => {},
    refresh: async (arg) => {
      calls++;
      assert.deepEqual(arg, config);
      await new Promise((resolve) => {
        release = resolve;
      });
    },
  });
  const first = scheduler.check();
  await scheduler.check();
  assert.equal(calls, 1);
  release();
  await first;
  now = REFRESH_INTERVAL - 1;
  await scheduler.check();
  assert.equal(calls, 1);
  now += 2;
  const second = scheduler.check();
  assert.equal(calls, 2);
  release();
  await second;
  scheduler.stop();
  now += REFRESH_INTERVAL;
  await scheduler.check();
  assert.equal(calls, 2);
});
test("failed automatic checks preserve the dataset and retry after 30 minutes", async () => {
  const state = { data: { config: { format: "M-C" } } };
  const original = state.data;
  const scheduler = startAutoRefresh({
    state,
    now: () => 1000,
    setTimer: () => 0,
    clearTimer: () => {},
    refresh: async () => {
      throw new Error("Offline");
    },
  });
  await scheduler.check();
  assert.equal(state.data, original);
  assert.equal(state.error, "Offline");
  assert.equal(Date.parse(scheduler.status.nextCheckAt), 1000 + RETRY_INTERVAL);
  scheduler.stop();
});
