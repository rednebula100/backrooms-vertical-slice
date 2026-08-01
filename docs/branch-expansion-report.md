# Level 0 branch expansion report — 0.3.0

## Outcome

The opening now leads to two fixed three-movement branches with seven total playable scenes. The A branch widens gradually through `L0-0002A → L0-0003A → L0-0004A`; the B branch stays compressed through corrected `L0-0002B → L0-0003B → L0-0004B`. The two `L0-0004*` paths remain unresolved production frontiers, but they now terminate in a provisional content-boundary sequence.

No reverse edge, runtime randomness, branch merge, entity, or rare level boundary was introduced. A temporary abstract symbol and reset epilogue now make the current content limit testable without inventing more canon.

## Assets and approval state

- `L0-0001` and `L0-0002A` retain provisional approval.
- `L0-0002B` was replaced to preserve the opening soffit in the immediate foreground.
- `L0-0003A`, `L0-0004A`, `L0-0003B`, and `L0-0004B` are new reference-grounded 1448×1086 PNG scenes.
- The replacement and all four new scenes require human canon review.
- The first playable vertical slice remains recoverable at Git commit `41fb610`.

## Data and navigation

The registry version is `vertical-slice-0.3.0`, intentionally invalidating earlier development saves. Scene records now include branch ownership, provenance, approval and review state, continuity anchors, and recent changes. Every active target has exactly one matching source scene/path, and the frontier registry mirrors the two pending endpoint paths at graph depth 3.

The follow-up-scene SVG polygons were redrawn around only the distant architectural openings; none extends into the bottom foreground. They remain invisible in normal play. On localhost or with `?dev=1`, a `MASKS OFF/ON` toggle exposes colored polygons, path IDs, pointer coordinates, and current scene/view data. Debug mode deliberately blocks navigation so mask inspection cannot change progress.

Selecting either pending path now saves a boundary state and opens the provisional abstract symbol. Selecting the symbol clears the saved run and shows the no-route reset epilogue. The next reload returns to `L0-0001`.

## Verification contract

The validator now checks required production metadata, movement/status values, exact 4:3 declarations, 44 CSS-pixel mobile target minima at a 320px viewport, missing targets, provenance mismatch, merges, cycles, unreachable scenes, frontier/world-version agreement, frontier depth, registry completeness, and the signature and actual dimensions of all seven scene PNGs plus both boundary PNGs. Fourteen automated model tests pass.

## Still unresolved

- Human canon approval for the corrected and newly generated scenes
- Physical-device touch-mask review
- Final canon approval for the provisional content-boundary symbol and reset epilogue
- First rare Level 0 boundary and its destination
- Batch-size policy after evaluating this two-scenes-per-branch expansion
