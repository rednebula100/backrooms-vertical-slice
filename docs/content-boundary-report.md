# Content-boundary and mask-debug report — 0.3.0

## Diagnosis

The scene raster, SVG overlay, and stage had matching browser rectangles, so the reported low click behavior was not a CSS or viewBox offset. The follow-up polygons themselves extended from the distant opening into the bottom foreground. Every non-root polygon is now constrained to the visible opening and capped above 80% of the source-image height on both desktop and mobile definitions.

## Development inspection mode

The `MASKS OFF/ON` control appears only on localhost or when the page is opened with `?dev=1`. Pressing `D` toggles the same mode. Enabled masks have distinct translucent colors, strokes, and fixed path-ID labels. A readout shows the current scene or boundary, path ID, and image-space pointer coordinates. Path selection is disabled while masks are visible.

## Current content limit

Pending paths at `L0-0004A` and `L0-0004B` both enter the same non-canon-expanding boundary sequence:

1. The pending path ID and boundary state are persisted.
2. A black boundary screen displays one original rectilinear glyph with one matching click region.
3. Clicking the glyph clears local progress and displays a no-route photographic epilogue whose carpet folds up the dead wall.
4. Reloading after the epilogue starts again at `L0-0001`.

The glyph and epilogue are provisional and still require human canon approval. They do not represent a rare level, entity, reverse edge, branch merge, random destination, or new lore.

## Browser verification

- Boundary state survived reload.
- The glyph raster loaded at its exact declared 1448×1086 dimensions and had one accessible link.
- The glyph link displayed the reset epilogue with no movement paths.
- Reload after the epilogue returned to the opening scene with both root paths.
- The narrowed `L0-0004B` mask covered only the distant opening in developer mode.
