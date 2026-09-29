# Meta Lens

A local Pokémon Champions matchup lab: import a team or a core, explore the metagame, inspect individual sets and damage rolls, then test stat-point reallocations.

This is a standalone project. It does not depend on, integrate with, or modify AIgislash.

## Start on Windows

1. Install [Node.js](https://nodejs.org/) 22.12 or newer.
2. Download and extract this repository, or clone it.
3. Double-click **Start Meta Lens.cmd**. On first launch it installs dependencies and builds the app, then opens your browser. Keep its console running while you use it.

Alternatively, on Windows, macOS, or Linux:

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:4783**. No account, API key, database installation, or paid service is needed. The server binds to the local machine only. Internet is needed for the first data refresh; cached data and the bundled engine work offline afterwards. Fonts have local fallbacks.

## Workflow

1. **Your team:** import 1–6 Pokémon as Showdown/Poképaste text or a public Poképaste URL. A clearly labeled example core appears on first launch. Teams persist in browser local storage. Edit held items, abilities, moves, nature, HP, stat stages and Champions stat points.
2. **Team × metagame:** switch between dealt damage and survival. Event usage ranks threats; the game’s usage rank is shown separately. A cell chooses a single move with the highest weighted KO chance across the modeled spreads, not a different move for each hidden spread. Sort by survival risk or filter a species.
3. **Matchup lab:** expand a cell, select an estimated ladder set or an actual published set, and inspect every move in both directions. See damage ranges, probability mass for every distinct total, source coverage, effective speed and the engine’s calculation description. Edit either side without changing the source data.
4. **Spread explorer:** choose a move, investment stat, funding stat and desired KO/survival chance. Scan all legal points along that budget path. Inspect breakpoints or apply a candidate back to the team. This is a transparent one-dimensional sweep, not a claim of global optimization.
5. **Data & sources:** choose recent events, a team format, top 20/40/80/all Pokémon, top 8/16/all reported spreads and 24/100/all published teams. The default is a fast 40-threat sample. Refresh progress, source dates, missing sheets and parsing warnings are visible.

Use **Published teams** to search the entire sheet index and load a team. The **Export analysis** button saves a JSON report including your team, field settings, source selection and matrix results.

## Fast battle controls

The matrix and 1v1 view expose manual stat-stage −/+ buttons, current HP, automatic Mega and ability toggles, weather/terrain pills, automatic Intimidate, Tailwind and Trick Room. Applied effects show the active Mega form and ability and the stages after automatic effects; changes are not double-counted across recalculations. Stat-point editors also have −/+ controls.

Each matrix cell separates **faster/slower** from **acts first** for the chosen fixed damaging moves, with conditional weighted order when it varies across spreads. The 1v1 initiative panel lets you select a move for each side and displays numeric priority and effective speeds. Priority brackets precede speed; Trick Room reverses speed within the bracket. Grassy Glide, Prankster, Gale Wings, Triage, Psychic Terrain and priority-blocking abilities are handled. Ties are labeled; conditional Quick Claw/Quick Draw order is reported uncertain. Move order assumes each action is usable, without predicting switching or whether the first attack KOs.

## Real data, explicit uncertainty

| Layer                           | Source                                                                                                                                              | What it means                                                                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tournament species usage        | [Pokedata](https://pokedata.ovh/standingsVGC) public Masters standings JSON                                                                         | Fraction of teams with an available sheet containing the species. Teams are pooled by participant count. Missing sheets are excluded and disclosed.                                    |
| Champions in-game distributions | [MunchStats](https://www.munchstats.com/about/) public in-game doubles endpoint                                                                     | The operator reports capturing Battle Data screens nightly. Species popularity is a **rank**, not a percentage. Spread, item, ability and nature distributions are separate marginals. |
| Published combinations          | [VGCPastes repository](https://docs.google.com/spreadsheets/d/1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw/edit), [Poképaste](https://pokepast.es/) | Actual shared sets, with links to their source. No ladder probability is assigned to them. Missing spreads are not fabricated.                                                         |

MunchStats provides an accessible community capture, **not an official Pokémon API**. Its public endpoint is undocumented and may change. The app never labels Showdown data as in-game data and does not require game-account credentials or device automation.

The default estimated set combines the most-used item, nature, ability and four moves with each reported spread. Those joint combinations are **not observed facts**. In particular, physical and special variants or different Mega stones can produce inconsistent modal combinations. Use the raw distributions to edit plausible alternatives, or select published sets for actual combinations. Matrix percentages are normalized within modeled spread coverage. Unmodeled spreads remain unknown. Failed calculations are excluded from coverage rather than silently counted as zero damage.

M-B/M-C selects the published-team tab and default event era. The in-game capture always reflects the current season, so historical M-B analysis carries an explicit mismatch warning. Verify that your selected events share the intended regulation. The app is not a complete team-legality validator.

## Calculation engine and scope

The runtime uses unmodified MIT-licensed [Nerd of Now / Nimbasa City Post](https://github.com/nerd-of-now/NCP-VGC-Damage-Calculator) Champions calculation scripts, pinned at commit `1369b359b85f0a6343df006acde92cc4a7d07805`. See [vendor provenance](vendor/ncp/PROVENANCE.md). Champions uses level 50, perfect IVs, 0–32 SP per stat, and 66 SP total. Standard EV pastes convert to equivalent level-50 points; low-IV imports fail explicitly.

The adapter supports Mega forms, items, abilities, stat stages, HP, status, weather, terrain, screens, Helping Hand, Friend Guard, Tailwind, Trick Room initiative, Protect, critical-hit scenarios, doubles spread reduction and move-specific controls. Auto weather/terrain assumes simultaneous entry: the slower setter activates last. Choose an explicit field for speed ties or a different switch sequence. Calculations use the selected evolved form; they do not simulate pre-Mega switch-in abilities.

Damage probability is conditional on a hit and the move's prerequisites being satisfied. Multi-hit rolls are convolved for the displayed hit count; hit-count randomness and accuracy are excluded. Focus Sash, Sturdy, Sitrus Berry and Oran Berry are tracked across hits. Some reactive states, such as Disguise/Ice Face, return unavailable KO probabilities. Other uncommon interactions may require checking against the original calculator or the game. This is not a turn simulator: no move-selection prediction, switching, residual-turn 2HKOs, partner attacks, or battle win probabilities are inferred.

## Development and checks

```sh
npm run dev       # API :4783 and Vite :5173
npm test          # offline unit/integration tests
npm run build    # production frontend
npm run check    # tests + production build
```

Tests cover parsing, SP legality, independent Smogon comparisons for unchanged mechanics, Mega aliases and abilities, Intimidate, weather, screens, immunity, roll mass, multi-hit behavior, Focus Sash, budget sweeps, source denominators and source separation. Browser interaction QA is documented in [validation](docs/VALIDATION.md). Passing tests do not establish correctness for every possible Pokémon interaction.

Architecture: React/Vite frontend → local Express API → cancellable background analysis worker, source adapters and the NCP engine in a VM context. `.cache/` contains downloaded public data and the last complete normalized dataset. It is excluded from Git; your team stays in the browser. Fetches use timeouts, bounded concurrency, a 24-hour response cache, a 30-day immutable paste cache, and stale-cache fallback. No private team is uploaded when requesting public data.

See [research](docs/RESEARCH.md) for existing tools and the reason for building this app. Pokémon names and trademarks belong to their respective owners. This project is unaffiliated with The Pokémon Company, Nintendo, Game Freak or the data providers.
