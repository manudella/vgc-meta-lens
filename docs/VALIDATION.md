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
