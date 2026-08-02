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

The seventeen committed playable rasters and every staged candidate are provisional production assets until human route review and promotion. The active target is one connected twenty-candidate cycle. Its first review wave contains ten candidates: two previously generated candidates and eight newly generated candidates. Human annotation of that wave creates the confirmed frontiers needed to generate the remaining ten without inventing disconnected routes. Every visually plausible opening must be registered; unproduced openings lead to the existing transparent boundary glyph.

The production queue lives in `production/generation-jobs.json`, staged candidates live in `public/scenes/staging-scenes.json`, and user playtest decisions live in `public/scenes/route-reviews.json`. Human polygon annotation is the authoritative route count and mask source; automated vision audits are optional diagnostics rather than a promotion authority. See [the human-gated production workflow](docs/human-gated-production.md) and [the Level 0 expansion policy](docs/level-0-expansion-policy-ko.md).

## Visual route audit

Generated geometry is checked by two independent production-time vision passes before release. The audit counts every plausible passage, compares the consensus with the registered click masks, and automatically blocks disagreements, missing masks, target-count mismatches, and every four-plus-route scene pending manual review.

```powershell
npm run audit:regressions
npm run audit:batch
npm run validate:audit
npm run validate:release
```

The three regression scenes are the human-confirmed `L0-0002B = 2`, `L0-0003B = 3`, and `L0-0004B = 2` cases. Audits run through the checked-in Codex CLI with ChatGPT sign-in, consume Codex plan usage, and explicitly discard ambient API-key variables. No credential is used by or shipped to the browser. See [the route-audit workflow](docs/route-audit-automation.md) for the exact rules and login check.

