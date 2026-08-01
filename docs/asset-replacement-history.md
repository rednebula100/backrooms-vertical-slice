# Asset replacement history

## L0-0002B — 0.2.0 continuity correction

- Stable scene ID: `L0-0002B`
- Stable incoming path: `L0-0001-P2`
- Stable asset URL: `/scenes/L0-0002B/final/L0-0002B.png`
- Previous asset recovery point: Git commit `41fb610`
- Replacement generation: `exec-e9268777-c7cb-41f7-9dff-560bfe772241.png`
- Reason: the original provisional follow-up resolved the opening-scene soffit too early. The replacement carries the lowered soffit into the immediate foreground before the acoustic ceiling resumes.
- Data effects: updated the click polygon for the corrected floor channel, revised continuity metadata, retained IDs and navigation provenance.
- Approval: provisional-generated; human canon review remains required.

## L0-0004B — exact aspect correction

- Stable scene ID and URL were retained.
- Initial generation: `exec-a5405771-a844-41c5-8004-aac9908468af.png` at 1449×1086.
- Corrected generation: `exec-e2e42df2-cd04-4154-a440-660d114e502b.png` at 1448×1086.
- Reason: enforce the exact 4:3 playable-asset contract without changing the scene design.

## L0-0003B — 0.4.0 spatial-progression correction

- Stable scene ID: `L0-0003B`
- Stable incoming path: `L0-0002B-P1`
- Stable asset URL: `/scenes/L0-0003B/final/L0-0003B.png`
- Previous asset recovery point: the parent of the 0.4.0 implementation commit
- Replacement generation: `exec-cea7b0bb-9d64-442a-9d82-bfea4d970931.png`
- References: direct source `L0-0002B`; downstream continuity target `L0-0004B`
- Reason: the former scene repeated `L0-0002B`'s corridor framing, central wall face, and near-right obstruction too closely. The replacement passes that obstruction, changes orientation, and introduces a staggered pocket while retaining one compressed B-branch route.
- Data effects: updated continuity metadata, path description, path screen location, opening-shaped masks, and scene-change notes while retaining IDs and navigation provenance.
- Approval: provisional-generated; human canon review remains required.

## A branch — 0.5.0 single-route correction

- Stable scene IDs and URLs: `L0-0002A`, `L0-0003A`, and `L0-0004A`.
- Replacement generations: `exec-1e100643-eab9-46f8-aee3-09991ac0d58a.png`, `exec-49b4d89c-efd2-4124-b266-e5f867cf5176.png`, and `exec-859ffaf0-24f0-4f5f-9367-c6d95602aedd.png`.
- Reason: offset walls and broad bays in the former rasters created additional apparent corridors even though every follow-up scene has one registered route.
- Geometry result: `L0-0002A` and `L0-0003A` retain one forward-left continuation; `L0-0004A` retains one right-side continuation. All other apparent ways are visibly sealed.
- Data effects: retained graph IDs and targets, aligned only the changed `L0-0002A` opening mask, revised continuity metadata, and advanced the world registry to `vertical-slice-0.5.0`.
- Recovery point: Git commit `e50f6cc`.
- Approval: provisional-generated; human canon review remains required.
