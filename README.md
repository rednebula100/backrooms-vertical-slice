# Backrooms vertical slice

A fixed, image-first Level 0 exploration slice built from actual AI-generated raster scenes. The page intentionally presents only one centered 4:3 image on black; invisible image-aligned SVG polygons receive movement input.

## Run

```powershell
npm test
npm run validate
npm run build
npm start
```

Open `http://127.0.0.1:4173`. Use `?reset=1` to clear saved progress. On localhost only, use `?scene=L0-0001`, `?scene=L0-0002A`, or `?scene=L0-0002B` for direct entry.

Progress is stored at `localStorage["backrooms.progress"]` with `scene_id` and `world_version`. Movement never writes browser-history entries.

## Asset status

All seven playable rasters are provisional production assets, not final human canon approvals. In `vertical-slice-0.5.0`, `L0-0001` is the only scene with two routes; every follow-up registers and visually presents one continuation. Scene registration, opening-aligned path geometry, and image paths live in `public/scenes/scenes.json`, so images can be replaced without navigation rewrites.

