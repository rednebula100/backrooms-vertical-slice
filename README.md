# Backrooms vertical slice

A fixed, image-first Level 0 exploration slice built from actual AI-generated raster scenes. The page intentionally presents only one centered 4:3 image on black; invisible image-aligned SVG polygons receive movement input.

## Run

```powershell
npm test
npm run validate
npm run build
npm start
```

Open `http://127.0.0.1:4173`. Use `?reset=1` to clear saved progress. On localhost only, use `?scene=<registered-scene-id>` for direct entry. Add `?dev=1` (or `?dev=1&scene=L0-0005A`) to expose the otherwise hidden click-mask debugger; press `D` to toggle masks.

Progress is stored at `localStorage["backrooms.progress"]` with `scene_id` and `world_version`. Movement never writes browser-history entries.

## Asset status

All seventeen playable rasters are provisional production assets, not final human canon approvals. `vertical-slice-0.7.0` adds the second five-scene production batch and brings the generated production set to ten scenes: six one-route scenes and four two-route scenes, with no generated three- or four-route outputs. The user-confirmed legacy B scenes retain their `2 / 3 / 2` route counts. Every visually plausible opening is registered; unproduced openings lead to the existing transparent boundary glyph.

The production queue lives in `production/generation-jobs.json`, and user playtest decisions live in `public/scenes/route-reviews.json`. `npm run validate:release` intentionally fails until all ten generated scenes have `playtestStatus: "pass"` and every required visual audit passes; that gate must pass before expanding to twenty scenes or publishing GitHub Pages.

## Visual route audit

Generated geometry is checked by two independent production-time vision passes before release. The audit counts every plausible passage, compares the consensus with the registered click masks, and automatically blocks disagreements, missing masks, target-count mismatches, and every four-plus-route scene pending manual review.

```powershell
npm run audit:regressions
npm run audit:batch
npm run validate:audit
npm run validate:release
```

The three regression scenes are the human-confirmed `L0-0002B = 2`, `L0-0003B = 3`, and `L0-0004B = 2` cases. Audits run through the checked-in Codex CLI with ChatGPT sign-in, consume Codex plan usage, and explicitly discard ambient API-key variables. No credential is used by or shipped to the browser. See [the route-audit workflow](docs/route-audit-automation.md) for the exact rules and login check.

