# Backrooms vertical slice

A fixed, image-first Level 0 exploration slice built from actual AI-generated raster scenes. The page intentionally presents only one centered 4:3 image on black; invisible image-aligned SVG polygons receive movement input.

## Run

```powershell
npm test
npm run validate
npm run packets:build
npm run build
npm start
```

Open `http://127.0.0.1:4173`. Use `?reset=1` to clear saved progress. On localhost only, use `?scene=<registered-scene-id>` for direct entry. Add `?dev=1` (or `?dev=1&scene=L0-0005A`) to expose the otherwise hidden click-mask debugger; press `D` to toggle masks.

Open `http://127.0.0.1:4173/atlas.html` for the developer-only world atlas. It is a wiki-like view of the level, sublevel, internal-region, and planned-boundary registry in `public/world/atlas.json`. The player-facing page does not expose these labels.

Progress is stored at `localStorage["backrooms.progress"]` with `scene_id` and `world_version`. Movement never writes browser-history entries.

## Asset status

The registry currently contains thirty-seven connected playable rasters and no staged candidates. The active twenty-scene cycle is complete: all twenty generated scenes have been human-annotated and promoted. The final eight route-conditioned wave-2 scenes each produced one human-confirmed route. Every visually plausible opening must be registered; unproduced openings lead to the existing transparent boundary glyph. Wave 2 uses eight distinct spatial archetypes so route-count constraints do not collapse every image into the same corridor-and-opening composition.

New scene generation is paused while the world skeleton is documented. The atlas currently defines six parent levels, seven sublevels, twenty-seven internal regions, and nine non-active connection candidates. Only Level 0 is in production; every other entry remains documentation-only until explicitly promoted.

The production queue lives in `production/generation-jobs.json`, staged candidates live in `public/scenes/staging-scenes.json`, and user playtest decisions live in `public/scenes/route-reviews.json`. Human polygon annotation is the authoritative route count and mask source; automated vision audits are optional diagnostics rather than a promotion authority. See [the world atlas rules](docs/world-atlas-ko.md), [the human-gated production workflow](docs/human-gated-production.md), and [the Level 0 expansion policy](docs/level-0-expansion-policy-ko.md).

Multi-route generation uses `public/scenes/route-packets.json`. Each packet binds one human-confirmed mask to a route-only selection map, clean crop, camera move, space relationship, continuity anchors, and a sibling-route exclusion prompt. The developer editor exposes these inputs through the selected route's `생성 입력` button.

## Visual route audit

Generated geometry is checked by two independent production-time vision passes before release. The audit counts every plausible passage, compares the consensus with the registered click masks, and automatically blocks disagreements, missing masks, target-count mismatches, and every four-plus-route scene pending manual review.

```powershell
npm run audit:regressions
npm run audit:batch
npm run validate:audit
npm run validate:release
```

The three regression scenes are the human-confirmed `L0-0002B = 2`, `L0-0003B = 3`, and `L0-0004B = 2` cases. Audits run through the checked-in Codex CLI with ChatGPT sign-in, consume Codex plan usage, and explicitly discard ambient API-key variables. No credential is used by or shipped to the browser. See [the route-audit workflow](docs/route-audit-automation.md) for the exact rules and login check.

