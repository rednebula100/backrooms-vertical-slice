# Content-boundary and mask-debug report — 0.4.0

## Diagnosis

The scene raster, SVG overlay, and stage had matching browser rectangles, so the reported low click behavior was not a CSS or viewBox offset. The polygons themselves selected floor wedges instead of the passage volumes. Every playable polygon is now drawn over the visible vertical opening, from ceiling line to threshold, in both desktop and mobile definitions.

## Development inspection mode

The `MASKS OFF/ON` control appears only when the page is opened with `?dev=1`; ordinary localhost and deployed URLs keep it hidden. Pressing `D` toggles the same mode only while development tools are available. Enabled masks have distinct translucent colors, strokes, and fixed path-ID labels. A readout shows the current scene or boundary, path ID, and image-space pointer coordinates. Path selection remains active while masks are visible, so the whole route can be inspected without leaving debug mode.

## Current content limit

Pending paths at `L0-0004A` and `L0-0004B` both enter the same non-canon-expanding boundary sequence:

1. The pending path ID and boundary state are persisted.
2. A black boundary screen composites one transparent-background rectilinear glyph with one matching click region.
3. Clicking the glyph clears local progress and displays a no-route photographic epilogue whose carpet folds up the dead wall.
4. Reloading after the epilogue starts again at `L0-0001`.

The glyph and epilogue are provisional and still require human canon approval. They do not represent a rare level, entity, reverse edge, branch merge, random destination, or new lore.

## Browser verification

- Boundary state survived reload.
- The glyph raster loaded as an exact 1448×1086 RGBA PNG, showed no rectangular backdrop, and had one accessible link.
- The glyph link displayed the reset epilogue with no movement paths.
- Reload after the epilogue returned to the opening scene with both root paths.
- Normal localhost hid all developer controls; `?dev=1` exposed them.
- With masks visible, both A and B paths remained clickable through their full sequences.
- Every desktop mask covered its passage opening instead of the foreground carpet.
