# NCP engine provenance

Source: https://github.com/nerd-of-now/NCP-VGC-Damage-Calculator

Commit: `1369b359b85f0a6343df006acde92cc4a7d07805`

Retrieved: 2026-09-29. `*.js` files are unmodified copies of `script_res/*.js` at that revision. `LICENSE` is the upstream MIT license. See `manifest.json` for SHA-256 integrity values; the offline test checks them.

The UI-independent adapter is `server/engine.mjs`. It supplies the original engine's Pokémon/move/field structures, additive Champions stats and a minimal jQuery compatibility surface for data merging and inactive UI toggles. No source-provider input is executed as code.

To update: review upstream mechanics changes, replace scripts from one explicitly pinned commit, update this file and the manifest, then run regression tests and review Champions-specific cases. Never silently download and execute the latest engine at app startup.
