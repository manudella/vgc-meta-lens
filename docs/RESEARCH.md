# Existing tools and source investigation

Research date: 2026-09-29. “No exact match found” describes this search, not a proof that no such tool exists.

## Closest existing products

| Tool                                                                                     | Verified overlap                                                           | What Meta Lens adds / separates                                                                                                                                      |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [VGC Multi Calc](https://vgcmulticalc.com/how-to-use/)                                   | Team vs Many, Many vs Team, 1v1, paste import, KO chances, EV optimization | A tournament-usage-first matrix, explicit source provenance and coverage, in-game marginal distributions and published combinations in the same expandable hierarchy |
| [MunchStats calculator](https://www.munchstats.com/calc/)                                | Weighted spread calculations, team import, in-game Champions data          | Locally cached multi-threat workspace, selected Pokedata event sample, budget-path exploration and source audit                                                      |
| [Nimbasa City Post calculator](https://nerd-of-now.github.io/NCP-VGC-Damage-Calculator/) | Mature Champions mechanics and manual exact calculations                   | Reuses its engine instead of reimplementing the damage formula; adds source ingestion and batch analysis                                                             |
| [Pikalytics team builder](https://www.pikalytics.com/team)                               | Team construction and meta calculations                                    | Transparent separate tournament and game samples; published-set drilldown and portable local source                                                                  |
| [Porygon Labs](https://www.porygonlabs.com/)                                             | Team building and damage-table workflow                                    | Explicit marginal-vs-joint labeling, event sample configuration and published spread references                                                                      |
| [PokemonVGC-Calculator](https://github.com/huydamm/PokemonVGC-Calculator)                | Automatic common-set population and Champions support                      | Broader event-to-set-to-move hierarchy and budget sensitivity                                                                                                        |

The first two are strong alternatives worth trying. The differentiator is the complete data-to-calculation workflow and the visibility of its assumptions, not the invention of batch damage calculations.

## Verified source paths

- **Pokedata:** event listing at `/standingsVGC`; each current event links a Masters page containing a Download JSON form. For example, `/standingsVGC/0000194/masters/0000194_Masters.json`. Its `decklist` contains species, items, abilities, natures and moves, but not necessarily stat spreads. Missing sheets cannot be included in a species-frequency denominator. [Reportworm's public repository](https://github.com/mikewVGC/vgc-standings) also documents the Pokedata JSON workflow; none of its private scrapers is used.
- **MunchStats:** its [own methodology](https://www.munchstats.com/about/) distinguishes monthly Showdown statistics from nightly game-screen captures. The site's shipped JavaScript uses `/api/<format>/<rating>/<pokemon>`. The app requests `championsdoubles/0/<pokemon>` and requires `is_champions_game: true`. `pokemon_names` supplies rank, and `spreads_list`, `items_list`, `abilities_list`, `natures_list` and `moves_list` supply separate distributions. `champions_updated` supplies the capture timestamp. The complete combination frequencies are not provided.
- **VGCPastes:** the user-supplied gid `736919171` is the index. It links Champions M-C (`2001945654`), M-B (`1458357160`) and M-A (`791705272`). CSV export is publicly readable; team URLs appear in the `Pokepaste` column. The `EVs` column indicates whether the sheet claims a spread, but the paste itself is still validated.
- **Poképaste:** public `/raw` endpoints expose the set text. Network imports are restricted to validated HTTPS Poképaste IDs; arbitrary URLs cannot be proxied through the local app.

## Adopted ideas

From multi-calculators: bidirectional batch comparisons and progressive disclosure. From spread-aware calculators: weighted damage uncertainty. From the original NCP calculator: established mechanics and detailed descriptions. From tournament dashboards: team-denominator usage and source dates. No proprietary frontend code or private data was copied.

## Remaining data limitations

There is no verified official public Champions Battle Data API in this research. MunchStats' community capture is currently a practical read path; it is undocumented, has no availability guarantee and its operator controls it. Independent marginal frequencies cannot recover full set correlations. Published teams supply correlations but are a selected sample without prevalence. An honest application must expose those distinctions rather than synthesize “perfect” population probabilities.
