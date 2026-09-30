# Validation record

Validated locally on Windows with Node 24.13.1 on 2026-09-30.

- 30 offline tests pass, including an independent Smogon comparison for unchanged single-hit mechanics and integrity verification of all nine vendored NCP scripts.
- Production Vite build passes. `npm audit` reports zero known vulnerabilities at validation time.
- A full-source stress run evaluated 1,554 cells / 46,398 set matchups across six Pokémon and the initial 259-entry source sample, with zero calculation exceptions. Subsequent canonical-name normalization merged repeated source aliases. The final dataset contains 257 unique species/form entries, all available reported spreads, and 100 published teams.
- Current tournament sample: 2,533 available public teams from three events. These counts describe this snapshot, not a fixed bundled metagame.
- In-game source schema, CSV export, raw Poképastes, source attribution and cache persistence were exercised against live endpoints. One invalid Flapple spread is explicitly excluded with a visible warning.
- Browser checks: partial-team text import, EV conversion, search filtering, expandable exact matchups, numeric damage ranges, probability plots, source-set selection controls, stage +/−, automatic Intimidate, priority versus raw speed, Trick Room reversal, and the legal-budget sweep.
- In a verified browser scenario, Garchomp's manual +1 Attack becomes 0 after Incineroar's automatic Intimidate. Incineroar's Fake Out acts first despite lower speed. Choosing Flare Blitz restores normal speed order; enabling Trick Room makes Incineroar act first within that equal-priority bracket.
- Batch analysis runs in a cancellable worker so the API remains available for 1v1 calculations and source status.

Limits: no real-game replay oracle or exhaustive Champions mechanic validation was performed. Conditional accuracy, hit counts, unsupported reactive states, incomplete joint distributions and format-era assumptions are described in the README and app. Exact values mean exact rolls for the supplied model and supported mechanics, not certainty about the opponent's unknown set or battle outcome.

## Matrix-first refinement

- The opening screen displays the matrix with compact team editing, modeled-spread damage envelopes, KO/survival probabilities, coverage counts and gap filtering. Stats/field controls expand on demand; exact 1v1 remains inside each row.
- Scope tests verify tournament ordering, whole-dataset search outside the top 20, rank fallback and invalid selection rejection.
- Local six-member API check: top 20 / 120 cells took 913 ms; a repeated cached request took 7 ms. Full loaded metagame: 257 threats / 1,542 cells in 10,207 ms, zero calculation exceptions. Timings are machine- and dataset-dependent.
- Browser checks exercised offense/defense gap filters, searching Flapple outside the top-20 scope, quick +1 Attack and Trick Room, and expanding Rillaboom versus Incineroar. Automatic Intimidate returned effective Attack to neutral, and automatic Grassy Terrain remained active.

## Version 0.2.0 refinements

- 40 offline tests and the production build pass. Added regressions for final-stage overrides, auto Intimidate prevention/Defiant, exact-form sprite names, CSV team previews, EV-labeled Champions SP, automatic move terrain, automatic investment axes/legal budgets, and regulation-date event selection.
- Browser verified: default diagonal dealt/received matrix; both single-direction modes; Intimidate visibly -1, + changes it to 0 without another drop, Reset restores automatic effects; compact numeric speed/range; published-set picker with full actual SP; adjacent expandable set editors; 33 attacking investments and 1,089 HP/Defense combinations.
- Mega Raichu Y official artwork loaded at intrinsic width 384; Kommo-o Showdown sprite loaded at width 96. Published previews use all six sheet roster columns, even without spreads. Exact-form missing assets show initials instead of a misleading base form.
- M-C defaults select all three currently indexed events in the regulation date window and all published teams. This snapshot indexes 409 team previews, with spread-bearing valid teams loaded into matchup choices; unsupported published moves remain visible source warnings. The old 100-card display cap is removed.
- Live sample parsing confirms Dragonite 2 HP / 32 SpA / 32 Spe is preserved from a Champions paste labeled EVs. Conventional 252 EV imports still convert to 32 SP. Lowercase nature labels are normalized.
- Terrain-dependent moves assume their enabling terrain only when no terrain-setting ability or explicit terrain overrides it; this assumption can be disabled with the quick Move terrain button. Tests compare automatic Expanding Force against explicit Psychic Terrain and against None.

Earlier records above describe prior versions; the initiative panel and manual funding-stat explorer were replaced in 0.2.0. No exhaustive game oracle validation is claimed.

## Version 0.3.0: damage bars, exact opponents and tournament forms

- 45 offline tests pass. Added direct exact-team versus 1v1 equivalence checks, distinct duplicate-species slots, tournament-form normalization/deduplication, unknown-form warnings, strict >50% KO highlighting, damage thresholds and capped damage bars.
- Audited all raw form labels in the three selected M-C events. Previously unmatched labels included Basculegion, Indeedee, Meowstic, regional Pokemon, Rotom and cosmetic forms. No unmapped labels remain in this snapshot.
- Corrected male Basculegion: 392 / 2,533 usable teams = 15.4757%; female: 2 / 2,533 = 0.0790%. Other recovered counts include Hisuian Arcanine 560, Indeedee-F 452, Indeedee 167 and Eternal Floette 299. Denominators still exclude missing sheets; aliases deduplicate within a team.
- All eight requested Mega artwork URLs returned HTTP 200 from PokeAPI's official-artwork collection; exact species IDs came from PokeAPI's Pokemon table.
- Removed coverage summary and sidebar slogan. Damage bars apply to both diagonal halves and both single-direction modes; the gap filter sits beside search.
- Browser verification: two-member text import produced eight exact cells; selecting MC405 from Published teams produced six opponent rows / 24 cells while preserving the four-member user team. Changing the opponent Rillaboom nature to Brave updated its matrix label and effective speed; restored Adamant afterward. Mega Staraptor rendered its 475px artwork. Both damage-only modes and the split view use damage range bars.
