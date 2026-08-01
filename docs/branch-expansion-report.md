# Level 0 branch expansion report — 0.5.0

## Outcome

The opening leads to two fixed three-movement branches with seven total playable scenes. `L0-0001` is the only scene that presents two routes. Every follow-up presents exactly one visually traversable continuation. In 0.5.0 the three A-branch rasters were replaced because their offset walls and open bays could imply extra routes even though the graph registered only one. The replacements retain the original branch flow while sealing those false openings. The B branch remains compressed through corrected `L0-0002B → L0-0003B → L0-0004B`.

No reverse edge, runtime randomness, branch merge, entity, or rare level boundary was introduced. A temporary abstract symbol and reset epilogue now make the current content limit testable without inventing more canon.

## Assets and approval state

- `L0-0001` retains provisional approval.
- `L0-0002A`, `L0-0003A`, and `L0-0004A` retain stable IDs and URLs but use 0.5.0 single-route replacement rasters.
- `L0-0002B` was replaced to preserve the opening soffit in the immediate foreground.
- `L0-0004B` retains its reference-grounded 1448×1086 PNG scene.
- `L0-0003B` retains its stable scene ID and URL but now uses a new 1448×1086 raster grounded by both adjacent B-branch scenes.
- All generated replacements and follow-up scenes require human canon review.
- The first playable vertical slice remains recoverable at Git commit `41fb610`.

## Data and navigation

The registry version is `vertical-slice-0.5.0`, intentionally invalidating earlier development saves. Scene records include branch ownership, provenance, approval and review state, continuity anchors, and recent changes. Every active target has exactly one matching source scene/path, and the frontier registry mirrors the two pending endpoint paths at graph depth 3.

Every playable path polygon now covers the full visible architectural opening, from its ceiling line down to its threshold, instead of selecting a wedge of floor. The overlays remain invisible in normal play. Developer inspection is opt-in through `?dev=1`; localhost alone no longer exposes the control. When enabled, the `MASKS OFF/ON` toggle shows colored polygons, path IDs, pointer coordinates, and current scene/view data without disabling path navigation.

Selecting either pending path saves a boundary state and opens the provisional abstract symbol. The symbol is an RGBA asset with a transparent background, composited over the page's black boundary field. Selecting it clears the saved run and shows the no-route reset epilogue. The next reload returns to `L0-0001`.

## Verification contract

The validator checks required production metadata, movement/status values, exact 4:3 declarations, 44 CSS-pixel mobile target minima at a 320px viewport, passage-opening mask geometry, missing targets, provenance mismatch, merges, cycles, unreachable scenes, frontier/world-version agreement, frontier depth, registry completeness, and the signature and actual dimensions of all seven scene PNGs plus both boundary PNGs. It additionally requires the boundary symbol to be RGBA. Sixteen automated model tests include the contract that only the opening scene may register multiple routes.

## Still unresolved

- Human canon approval for the corrected and newly generated scenes
- Physical-device touch-mask review
- Final canon approval for the provisional content-boundary symbol and reset epilogue
- First rare Level 0 boundary and its destination
- Batch-size policy after evaluating this two-scenes-per-branch expansion
