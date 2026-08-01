# First playable vertical-slice report

## Audit conclusion

The supplied workspace contained no repository or implementation—only empty task-container directories. No framework, components, assets, tests, or deployment configuration were available to preserve. A minimal dependency-free static ES-module project was therefore necessary. The deliverable remains local and preview-ready; it was not publicly deployed.

## Source and instruction layers

The complete connected Google Doc was exported and saved as `docs/world-bible-ko.md`. `AGENTS.md` contains stable operating constraints. `docs/level0-image-brief.en.md` is the compact production brief, and `docs/level0-image-brief-review.md` records its source coverage, omissions, interpretations, and unresolved judgment calls.

## Generated raster assets

The built-in `$imagegen` workflow produced four independent opening candidates:

- `public/scenes/L0-0001/candidates/L0-0001-C01.png`
- `public/scenes/L0-0001/candidates/L0-0001-C02.png`
- `public/scenes/L0-0001/candidates/L0-0001-C03.png`
- `public/scenes/L0-0001/candidates/L0-0001-C04.png`

C03 was provisionally selected and refined as `public/scenes/L0-0001/final/L0-0001-final.png`. Two reference-grounded follow-ups were generated as `L0-0002A.png` and `L0-0002B.png`. Every playable asset is a real 1448×1086 PNG (exact 4:3). Complete prompts, reference roles, default generation filenames, candidate metadata, a contact sheet, and replacement history are preserved.

## Provisional selection

C03 best satisfies the opening requirements: a broad, brighter left bend and a narrower, soffit-defined right passage differ in depth, form, visibility, and screen weight without becoming paired doors or menu cards. The central blocking wall keeps either route from reading as the single correct vanishing point. Both routes accept large, non-overlapping invisible polygons.

This is not final canon approval. The image URL and region coordinates are data in `public/scenes/scenes.json`, so later image replacement does not require navigation rewrites.

## Path interpretation and continuity

`L0-0001-P1` moves forward and left around the central wall. `L0-0002A` advances a few meters and rotates left; the curved outer wall continues on the left, the prior central wall becomes the near right wall, and carpet, trim, ceiling grid, fluorescent alignment, eye height, and lens character persist.

`L0-0001-P2` enters the compressed passage and turns slightly right. `L0-0002B` preserves the rounded inner wall on the left, straight outer wall on the right, narrower width, carpet, ceiling system, dimmer fluorescent character, eye height, and lens family. The source soffit resolves into the lower corridor ceiling somewhat sooner than ideal, but the provisional direct adjacency remains readable.

Each follow-up contains one real visible forward route registered as a `pending` production frontier. Activating a pending route records the frontier ID without inventing a target or presenting a false ending. The unresolved boundary symbol and reset epilogue were intentionally not designed in this milestone.

## Click overlay

SVG is used only as an invisible input layer over raster images. The overlay shares the image's native `0 0 1448 1086` coordinate system and exact rendered rectangle. Desktop polygons match the visible openings; mobile polygons are enlarged and non-overlapping. The implementation chooses mobile regions for coarse pointers or viewports up to 640 px. Paths expose hidden accessible names, use `pointerup`, cancel on drag/multi-touch, retain pinch zoom, and show only the pointer cursor on desktop. Keyboard-only focus outlines are allowed.

## Navigation, persistence, and loading

The registry defines fixed `L0-0001-P1 → L0-0002A` and `L0-0001-P2 → L0-0002B` connections. Navigation swaps the image without pushing browser history, so Back leaves the site instead of reversing movement. Reachable images preload through `Image` objects. Every successful movement saves `scene_id` and `world_version` to localStorage; reload and revisit restore only valid same-version scenes. `?reset=1` clears progress. Localhost-only `?scene=<scene_id>` provides direct development entry.

## Validation performed

Commands:

- `npm test` — 8/8 tests passed
- `npm run validate` — 3 scenes validated with no missing assets, duplicate IDs, missing targets, invalid pending paths, out-of-bounds regions, or cycles
- `npm run build` — static build completed successfully in `dist/`

Browser verification covered:

- Pure black page, empty title, one centered uncropped 4:3 raster, no visible UI or text
- Natural 1448×1086 image loading and exact overlay/image rectangle alignment
- Invisible transparent regions and pointer-only desktop hover feedback
- Both starting paths reaching their fixed distinct follow-ups
- Non-clickable central-wall area doing nothing
- Save and reload restoration after the left branch; reset then save and reload restoration after the right branch
- Browser Back leaving the page (`about:blank` in the isolated test tab), not returning to the opening scene
- `?reset=1` and localhost-only direct scene entry
- Desktop 1440×1000 and mobile 390×844 layouts
- Mobile 4:3 preservation, 13 px left and 12.6 px right black margins, enlarged non-overlapping hit polygons, and successful mobile-sized path activation
- Clean final browser console with no warnings or errors

## Known limitations

- All three playable images are provisional and still need human canon approval.
- `L0-0002B` compresses the source soffit transition slightly more than ideal.
- Pending frontier activation intentionally has no visible boundary treatment; that replacement behavior is minimal and temporary.
- Browser keyboard zoom was not changeable in the in-app test backend. Alignment is structurally guaranteed by a shared containing block, identical image/SVG rectangles, and the native SVG viewBox, and it was verified across desktop and mobile viewport scales; physical-device zoom and iOS/Safari remain worthwhile manual checks.
- No deployment was attempted or authorized.

## Recommended next milestone

First, perform human canon review of `L0-0001-final`, `L0-0002A`, and `L0-0002B`. Then extend each registered frontier with a short depth-first bundle of two directly adjacent Level 0 scenes, preserving its existing anchors and replacing `L0-0002A-P1` and `L0-0002B-P1` with fixed active targets. Recheck masks on at least one physical touch device before expanding further. Do not introduce a rare level boundary, entity, branch merge, or final boundary/reset design in that next bundle.

