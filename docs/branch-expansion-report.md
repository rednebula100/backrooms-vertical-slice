# Level 0 branch expansion report — 0.2.0

## Outcome

The opening now leads to two fixed three-movement branches with seven total playable scenes. The A branch widens gradually through `L0-0002A → L0-0003A → L0-0004A`; the B branch stays compressed through corrected `L0-0002B → L0-0003B → L0-0004B`. Only the two `L0-0004*` paths remain unresolved production frontiers.

No reverse edge, runtime randomness, branch merge, entity, rare level boundary, final boundary symbol, or reset epilogue was introduced.

## Assets and approval state

- `L0-0001` and `L0-0002A` retain provisional approval.
- `L0-0002B` was replaced to preserve the opening soffit in the immediate foreground.
- `L0-0003A`, `L0-0004A`, `L0-0003B`, and `L0-0004B` are new reference-grounded 1448×1086 PNG scenes.
- The replacement and all four new scenes require human canon review.
- The first playable vertical slice remains recoverable at Git commit `41fb610`.

## Data and navigation

The registry version is `vertical-slice-0.2.0`, intentionally invalidating earlier development saves. Scene records now include branch ownership, provenance, approval and review state, continuity anchors, and recent changes. Every active target has exactly one matching source scene/path, and the frontier registry mirrors the two pending endpoint paths at graph depth 3.

Invisible responsive SVG polygons were redrawn against the visible carpet routes. They remain input-only and add no visible interface.

## Verification contract

The validator now checks required production metadata, movement/status values, exact 4:3 declarations, 44 CSS-pixel mobile target minima at a 320px viewport, missing targets, provenance mismatch, merges, cycles, unreachable scenes, frontier/world-version agreement, frontier depth, registry completeness, on-disk PNG signature, and actual PNG dimensions.

## Still unresolved

- Human canon approval for the corrected and newly generated scenes
- Physical-device touch-mask review
- Central content-boundary symbol
- Reset epilogue image and behavior
- First rare Level 0 boundary and its destination
- Batch-size policy after evaluating this two-scenes-per-branch expansion
