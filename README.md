# Meta Lens

A local Pokémon Champions matchup lab: import a team or a core, explore the metagame, inspect individual sets and damage rolls, then test stat-point reallocations.

This is a standalone project. It does not depend on, integrate with, or modify AIgislash.

## Install the Windows app

Download **Meta-Lens-1.0.0-x64-setup.exe** from the [latest release](https://github.com/manudella/vgc-meta-lens/releases/latest). Run the installer, then open **Meta Lens** from the Start menu or desktop shortcut. No Node.js, terminal, account, or API key is needed.

A **portable.exe** is also available: run it without installing. Both editions save teams and public-data caches in your Windows user profile, so replacing the executable preserves your workspace. The portable edition is installation-free, not a USB-contained profile. The release is unsigned; Windows may display an unknown-publisher/SmartScreen prompt.

The first launch downloads the public data. Later launches show cached results while checking for updates. Closing the window exits the app and its local server. Source links open in your regular browser; exports use a Save dialog.

## Automatic data updates

- Checks on every launch and every **6 hours while the app is open**; checks due during sleep run on resume. Failed refreshes retry after **30 minutes**.
- Official Champions news supplies regulation names and start/end timestamps. A future announcement is not selected before its start time. The app discovers matching VGCPastes tabs rather than requiring new hardcoded tab IDs.
- **Follow the latest active regulation automatically** is enabled by default. A rollover selects all indexed tournaments in that regulation. **Include all events** automatically incorporates newly published events and updated standings.
- In **Data & sources**, choose a regulation to pin it or untick events for a custom sample. Save with **Refresh selected sources**. Custom selections survive automatic refreshes. The source panel shows the last refresh, next check, and stale-data warnings.
- Cached data remains usable if a source is offline. Your last complete dataset is retained if a refresh fails. Data is stored locally; private teams are never sent to the data providers.

Checks run while the app is open, not as a Windows background service. Discovery depends on the public sources retaining readable formats. Unknown Pokémon or mechanics require an app/engine update and are reported rather than silently assigned invented calculations. **Help → Releases & updates** opens new app downloads; executable updates are not installed automatically.

## Run from source

Install Node.js 22.12 or newer, download/clone this repository, then double-click **Start Meta Lens.cmd**. This development launcher installs dependencies, builds the app, and opens a browser with a local console server.

Alternatively, on Windows, macOS, or Linux:

```sh

npm ci

npm run build

npm start

```

Open **http://127.0.0.1:4783**. No account, API key, database installation, or paid service is needed. The server binds to the local machine only. Internet is needed for the first data refresh; cached data and the bundled engine work offline afterwards. Fonts have local fallbacks. Pokémon images load from Pokémon Showdown, with exact-form artwork from the official Pokémon Legends site and the [PokeAPI sprite collection](https://github.com/PokeAPI/sprites); unavailable images use labeled placeholders. Image credits remain with their respective creators and Pokémon rights holders.

## Workflow

1. **Your team:** import 1–6 Pokémon as Showdown/Poképaste text or a public Poképaste URL. A clearly labeled example core appears on first launch. Teams persist in browser local storage. Edit held items, abilities, moves, nature, HP, stat stages and Champions stat points.

2. **Matchup matrix (the opening screen):** rows are meta opponents and columns are your Pokémon. Cells show the damage range across modeled spreads, OHKO or survival chance, speed and move order. The default **Both** view splits each cell diagonally into dealt and received damage; each half names its move, and a separate label identifies the faster side. Switch to **Damage dealt / Damage received** for one direction; horizontal bars show damage (solid to the minimum roll, striped to the maximum, capped at 100% HP). Color uses the maximum roll: green below 50%, yellow from 50% through 80%, red above 80%. A bold dark-red **✹ KO** badge marks KO probability strictly above 50%, in either direction. Background colors depend only on damage, never speed or KO probability. **Show coverage gaps**, beside search, filters rows without a ≥95% KO or survival option for the selected direction. This is conditional matchup coverage, not a team win rating. The quick view calculates the top 20 by event usage; select top 40/80/all to expand it. Search covers every loaded threat, even outside the top 20. Game rank is displayed separately. A cell chooses a single move with the highest weighted KO chance across modeled spreads, not a different move for each hidden spread. Header and opponent labels stay visible as you scroll on desktop.

3. **Matchup lab:** expand a cell, select an estimated ladder set or an actual published set, and inspect every move in both directions. See damage ranges, probability mass for every distinct total, source coverage, effective speed and the engine’s calculation description. Edit either side without changing the source data.

4. **Spread explorer:** choose a move and desired KO/survival chance. The app automatically scans Attack/Sp. Atk for KOs, or all 1,089 HP + Defense/Sp. Def combinations for survival (including Body Press and Psyshock exceptions). Preview the full legal spread before applying it. Other stats stay unchanged if possible; otherwise they are reduced proportionally to remain within 66 points. This tests the selected nature and scenario, not every possible build.

5. **Data & sources:** default to the latest active regulation discovered from official news, all indexed events dated within it, and all published teams. You can choose a historical metagame, a custom event sample, top 20/40/80/all Pokémon, top 8/16/all reported spreads and 24/100/all published teams. The default data refresh loads 40 threats; the matrix opens with a fast top-20 view of the loaded data. Refresh progress, source dates, missing sheets and parsing warnings are visible.

Use **Team vs team** for a matrix against 1–6 exact opponent sets. Import text/a Poképaste, or click **Use as opponent** on a published team. Click opponent roster entries to edit them; opponent edits in the expanded matchup also update the matrix. Both teams persist independently in browser storage. Missing spreads remain labeled as unknown and use 0 SP until edited. This compares individual matchups, not a simulated doubles battle.

Use **Published teams** to search the entire sheet index and load either side. The **Export analysis** button saves a JSON report including your team, field settings, source selection and matrix results.

## Fast battle controls

Open **Stats & field** above the matrix for manual stat-stage −/+ buttons, current HP, automatic Mega and ability toggles, weather/terrain pills, automatic Intimidate, Tailwind and Trick Room. The same quick controls are always available in the expanded 1v1 view. **More conditions** exposes screens, Helping Hand, Protect and other situational effects. Stage buttons show the actual stages after automatic effects such as Intimidate. Editing sets an explicit final-stage override; Reset restores automatic behavior. Applied effects show the active Mega form and ability; changes are not double-counted across recalculations. Stat-point editors also have −/+ controls.

The quick confrontation shows numeric effective speeds and the modeled opponent speed range. Move rows label nonzero priority; single-direction matrix modes also show move order. Priority brackets precede speed, and Trick Room reverses speed within a bracket. The speed label in the split matrix means raw effective speed, not a prediction of who wins the turn.

With terrain on Auto, a terrain-setting ability takes precedence. If neither side sets terrain, **Move terrain auto** assumes the terrain needed by Expanding Force, Rising Voltage, Grassy Glide or Misty Explosion (first listed matching move if conflicting). Turn it off or choose an explicit terrain/None to test other conditions. This is a scenario assumption, not a claim that the move creates terrain.

## Real data, explicit uncertainty

| Layer | Source | What it means |

| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| Tournament species usage | [Pokedata](https://pokedata.ovh/standingsVGC) public Masters standings JSON | Fraction of teams with an available sheet containing the species. Teams are pooled by participant count. Missing sheets are excluded and disclosed. |

| Champions in-game distributions | [MunchStats](https://www.munchstats.com/about/) public in-game doubles endpoint | The operator reports capturing Battle Data screens nightly. Species popularity is a **rank**, not a percentage. Spread, item, ability and nature distributions are separate marginals. |

| Published combinations | [VGCPastes repository](https://docs.google.com/spreadsheets/d/1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw/edit), [Poképaste](https://pokepast.es/) | Actual shared sets, with links to their source. No ladder probability is assigned to them. Missing spreads are not fabricated. |

MunchStats provides an accessible community capture, **not an official Pokémon API**. Its public endpoint is undocumented and may change. The app never labels Showdown data as in-game data and does not require game-account credentials or device automation.

The default estimated set combines the most-used item, nature, ability and four moves with each reported spread. Those joint combinations are **not observed facts**. In particular, physical and special variants or different Mega stones can produce inconsistent modal combinations. Use the raw distributions to edit plausible alternatives, or select published sets for actual combinations. Matrix percentages are normalized within modeled spread coverage. Unmodeled spreads remain unknown. Failed calculations are excluded from coverage rather than silently counted as zero damage.

Tournament ingestion normalizes Pokedata bracketed gender, regional and form names before matching calculator/ladder names. Battle-relevant genders and regional forms remain separate; unknown labels produce a source warning rather than disappearing silently.

The selected regulation determines the published-team tab and event era. The in-game capture always reflects the current season, so historical analysis carries an explicit mismatch warning. Verify that your selected events share the intended regulation. The app is not a complete team-legality validator.

## Calculation engine and scope

The runtime uses unmodified MIT-licensed [Nerd of Now / Nimbasa City Post](https://github.com/nerd-of-now/NCP-VGC-Damage-Calculator) Champions calculation scripts, pinned at commit `1369b359b85f0a6343df006acde92cc4a7d07805`. See [vendor provenance](vendor/ncp/PROVENANCE.md). Champions uses level 50, perfect IVs, 0–32 SP per stat, and 66 SP total. EV-labeled Champions pastes with no stat above 32 and a total at most 66 retain their values as SP; conventional large EV spreads convert to equivalent level-50 points. Ambiguous small legacy EV spreads should be converted to explicit SPs before importing; low-IV imports fail explicitly.

The adapter supports Mega forms, items, abilities, stat stages, HP, status, weather, terrain, screens, Helping Hand, Friend Guard, Tailwind, Trick Room initiative, Protect, critical-hit scenarios, doubles spread reduction and move-specific controls. Auto weather/terrain assumes simultaneous entry: the slower setter activates last. Choose an explicit field for speed ties or a different switch sequence. Calculations use the selected evolved form; they do not simulate pre-Mega switch-in abilities.

Damage probability is conditional on a hit and the move's prerequisites being satisfied. Multi-hit rolls are convolved for the displayed hit count; hit-count randomness and accuracy are excluded. Focus Sash, Sturdy, Sitrus Berry and Oran Berry are tracked across hits. Some reactive states, such as Disguise/Ice Face, return unavailable KO probabilities. Other uncommon interactions may require checking against the original calculator or the game. This is not a turn simulator: no move-selection prediction, switching, residual-turn 2HKOs, partner attacks, or battle win probabilities are inferred.

## Development and checks

```sh

npm run dev       # API :4783 and Vite :5173

npm test          # offline unit/integration tests

npm run build    # production frontend

npm run check    # tests + production build

npm run desktop  # launch the desktop app from source

npm run dist:win # build Windows x64 installer and portable app in release/

pwsh -File scripts/smoke-desktop.ps1 # test packaged launch and calculation worker

```

Tests cover parsing, SP legality, independent Smogon comparisons for unchanged mechanics, Mega aliases and abilities, Intimidate, weather, screens, immunity, roll mass, multi-hit behavior, Focus Sash, budget sweeps, source denominators and source separation. Browser interaction QA is documented in [validation](docs/VALIDATION.md). Passing tests do not establish correctness for every possible Pokémon interaction.

Architecture: React/Vite frontend → local Express API → cancellable background analysis worker with a bounded in-memory result cache, source adapters and the NCP engine in a VM context. The desktop shell uses a sandboxed renderer and a stable local app origin, backed by a loopback-only server on an available port. Its profile stores your team and downloaded data; **Help → Open data folder** locates the cache. The source/browser edition uses `.cache/` (excluded from Git) and browser local storage. Refreshes check mutable sources online, with timeouts, bounded concurrency, a 30-day immutable paste cache, and stale-cache fallback. Dataset replacements are atomic. The Windows CI workflow builds both artifacts and tests the packaged calculator worker in an isolated profile. No private team is uploaded when requesting public data.

See [research](docs/RESEARCH.md) for existing tools and the reason for building this app. Pokémon names and trademarks belong to their respective owners. This project is unaffiliated with The Pokémon Company, Nintendo, Game Freak or the data providers.
