# Generation prompts and run metadata

All seven raster operations used the built-in `$imagegen` path. Candidate calls were independent generations. `L0-0001-final` used C03 as an edit target/reference with explicit geometry invariants. Both follow-ups used `L0-0001-final` as a generation reference, not as an edit target. Saved project assets are exact 1448×1086 PNG files.

## L0-0001-C01

Default output: `exec-4a91b225-04ad-48a0-91d7-df68f0079647.png`

```text
Use case: photorealistic-natural
Asset type: playable web exploration scene candidate, scene L0-0001-C01
Primary request: Create an original, recognizable Level 0 yellow-backrooms interior with two natural architectural movement paths.
Scene/backdrop: A mostly empty late-1980s/1990s low-cost North American commercial back-office interior whose purpose is unclear. A broad cream-yellow carpeted room opens deeper toward the center-left through a wide offset opening; a second narrower route turns away behind a partition on the right and is partially occluded. The two routes differ in depth, form, visibility, and screen position and must read naturally from the architecture—not as two choice doors.
Style/medium: Photorealistic consumer digital-camera photograph from the late 1990s to mid-2000s; subtle sensor noise, restrained dynamic range, slight fluorescent white-balance error; no cinematic grading.
Composition/framing: Exact landscape 4:3 frame; standing human eye height about 1.65 m; moderate field of view, approximately a 40 mm full-frame equivalent; level camera; image composed so neither route is dominant, heroic, safe, evil, highlighted, or equally framed. Keep the visible architecture suitable for later invisible polygon hit regions.
Lighting/mood: Flat overhead fluorescent light, bright but stale; familiar, hollow, still, faintly unsettling, weak architectural wrongness only.
Color palette: Yellowed cream and nicotine beige walls, brown-beige commercial carpet, off-white acoustic drop-ceiling tiles, dull metal ceiling grid.
Materials/textures: Cheap wallpaper over drywall, vinyl base trim, worn continuous carpet, mismatched but plausible maintenance-era details, slight dampness and discoloration without ruin.
Constraints: Realistic architectural plausibility with subtle proportion errors; mostly empty; no text or watermark; no visible people or living entities; no corpses, gore, combat, chase, occult symbols, readable logos, readable documents, futuristic or luxury design, fantasy geometry, exterior scenery, large debris, extreme ruin, strong VHS/CCTV/glitch/date overlay; no fisheye or exaggerated wide angle; no symmetrical choice doors, portals, game menu, cards, UI, arrows, signs, glowing paths, or colored highlights.
```

## 0.7.0 visible-route completion batch

All five assets were generated in built-in `imagegen` mode with the source image used only as a continuity reference. Final dimensions are 1448×1086 PNG (exact 4:3). The batch deliberately contains three one-route scenes and two two-route scenes.

### L0-0003C

Reference: `L0-0002B.png`, route `L0-0002B-P2`. Output: `exec-c510901a-8612-4b81-a7c9-1b42b6f8a424.png`.

```text
Generate a brand-new adjacent Backrooms Level 0 scene for L0-0003C. The supplied image is a continuity reference only, not an edit target. The camera has walked only several meters through L0-0002B's SECOND route: the compressed opening along the RIGHT side of the offset pier, not the existing center-left route. Show the immediately adjacent space after clearing that pier. Preserve pale yellow-beige patterned wallpaper, taupe patterned low-pile carpet, dark vinyl base trim, acoustic ceiling grid, dim flat fluorescent panels, standing eye height about 1.65 m, moderate 40 mm-equivalent lens, and late-1990s to mid-2000s budget consumer-digital photographic character. Keep the B branch narrow and slightly dim. Present exactly ONE visually traversable wall-bounded carpet continuation, offset left and bending out of sight. All other wall masses must join or close so no second passage, doorway, bay, alcove, gap, dark slot, or implied corridor reads as walkable. Exact landscape 4:3. Mostly empty. No text, UI, labels, arrows, people, entities, furniture, doors, windows, signs, landmarks, new level, dramatic horror, VHS, glitch, fisheye, bloom, or watermark.
```

### L0-0004C

Reference: `L0-0003B.png`, route `L0-0003B-P2`. Initial output: `exec-6672f664-f049-4da2-8ece-f6bd41843f82.png`. Final correction output: `exec-1a842cf3-d546-48bb-b9a9-5ea3eeaf3eaf.png`.

```text
Generate a brand-new adjacent Backrooms Level 0 scene for L0-0004C. The supplied image is a continuity reference only, not an edit target. The camera has walked only several meters through L0-0003B's LEFTMOST user-confirmed route, slipping around the near staggered wall mass. Do not follow the existing far-right route or the middle route. Show the immediately adjacent view after the left turn. Preserve the compressed B-branch family: pale yellow-beige patterned wallpaper, taupe patterned low-pile carpet, dark vinyl base trim, acoustic ceiling grid, muted flat fluorescent panels, standing eye height about 1.65 m, moderate 40 mm-equivalent lens, and budget consumer-digital photographic realism. Present exactly ONE visually traversable tall wall-bounded carpet continuation, forward-right at medium depth. Join and seal all other wall masses so there is no second opening, hidden bay, slot, doorway, side corridor, or implied route. Exact landscape 4:3. Mostly empty. No text, UI, labels, arrows, people, entities, furniture, doors, windows, signs, landmarks, new level, dramatic horror, VHS, glitch, fisheye, bloom, or watermark.
```

Correction prompt:

```text
Edit Image 1 as the target scene L0-0004C. Image 2 is the previous-scene continuity reference only. Preserve Image 1's exact landscape 4:3 framing, Level 0 materials, lighting, camera height, lens, long left wall, empty mood, and photographic character. Make the smallest architectural correction needed: move the only right-turn passage inward from the cropped image edge so it becomes one fully visible, tall, wall-bounded opening at center-right with carpet visibly continuing through it. Keep the opening clearly inside the frame with solid wall visible on both its left and right sides. Seal and join every other wall edge, floor channel, bay, slot, or recess. The finished image must contain exactly ONE plausible traversable passage. No doors, extra openings, freestanding partitions, text, UI, people, entities, furniture, windows, signs, landmarks, arrows, dramatic horror, glitch, fisheye, or watermark.
```

### L0-0004D

Reference: `L0-0003B.png`, route `L0-0003B-P3`. Initial output: `exec-43e316d2-0f3b-453d-ba45-ef95fb0dfac1.png`. Final correction output: `exec-b47a9231-ae48-49f1-927f-a0d95bbdb076.png`.

```text
Generate a brand-new adjacent Backrooms Level 0 scene for L0-0004D. The supplied image is a continuity reference only, not an edit target. The camera has walked only several meters through L0-0003B's MIDDLE user-confirmed route between its two staggered wall masses. Do not follow the far-right opening or the leftmost route. Show the immediately adjacent view after passing between those walls. Preserve the compressed B-branch family: pale yellow-beige patterned wallpaper, taupe patterned low-pile carpet, dark vinyl base trim, acoustic ceiling grid, muted flat fluorescent panels, standing eye height about 1.65 m, moderate 40 mm-equivalent lens, and late-1990s to mid-2000s budget consumer-digital photographic realism. Present exactly TWO visually traversable, tall, fully wall-bounded carpet openings: a narrow primary opening ahead-left and a smaller secondary opening on the right at a different depth. Separate them with one continuous solid wall mass. Neither opening may hide or imply a third route. Close every other wall edge and bay. Exact landscape 4:3, strong asymmetry, no paired-door/menu composition. Mostly empty. No text, UI, labels, arrows, people, entities, furniture, doors, windows, signs, landmarks, new level, dramatic horror, VHS, glitch, fisheye, bloom, or watermark.
```

Correction prompts:

```text
Edit Image 1 as the target scene L0-0004D. Image 2 is the previous-scene continuity reference only. Preserve Image 1's exact landscape 4:3 framing, central broad wall mass, Level 0 materials, muted lighting, camera height, lens, empty mood, and photographic character. Make the smallest architectural correction needed so the finished image has exactly TWO and only two plausible traversable passages: one clean uninterrupted corridor on the left side of the central wall, and one fully bounded opening on the right side of the central wall. On the left, remove or join the thin inner pier and every extra exposed wall edge so the left corridor cannot split into multiple slots. On the right, connect the outer right wall continuously to the image boundary so nothing can pass around its far side. Keep carpet visible through both intended openings, with one continuous solid central wall separating them. No third passage, nested opening, hidden bay, slot, freestanding partition, door, text, UI, people, entities, furniture, windows, signs, landmarks, arrows, dramatic horror, glitch, fisheye, or watermark.
```

```text
Edit Image 1 as the target L0-0004D; Image 2 is continuity reference only. Preserve exact 4:3 framing, the broad central wall, the fully bounded right opening, Level 0 materials, lighting, camera, and photographic character. The left corridor currently appears to terminate at a flat wall. Correct only that problem: create a clearly visible architectural continuation at the far end of the left corridor by offsetting the back wall so the carpet unmistakably bends left through a tall opening and continues out of sight. Keep the entire left side as ONE uninterrupted route with continuous outer wall and no thin pier, no extra exposed wall edge, and no side slot. Keep the right side as ONE route and join the outer right wall to the image boundary. The result must contain exactly TWO traversable routes total, left and right, separated by the central solid wall. No third route, door, nested opening, text, UI, people, entities, furniture, windows, signs, arrows, dramatic horror, glitch, fisheye, or watermark.
```

### L0-0005C

Reference: `L0-0004B.png`, route `L0-0004B-P2`. Output: `exec-4d167cfa-8c74-4dca-af78-a57014b7d235.png`.

```text
Generate a brand-new adjacent Backrooms Level 0 scene for L0-0005C. The supplied image is a continuity reference only, not an edit target. The camera has walked only several meters through L0-0004B's SECOND user-confirmed route, slipping LEFT around the staggered left wall mass. Do not follow the existing right-hand carpet route. Show the immediately adjacent space after clearing the left offset. Preserve pale yellow-beige patterned wallpaper, taupe patterned low-pile carpet, dark vinyl base trim, acoustic ceiling grid, muted fluorescent panels, standing eye height about 1.65 m, moderate 40 mm-equivalent lens, and budget consumer-digital photographic realism. Keep this B-derived branch compressed and modestly dim. Present exactly ONE visually traversable tall wall-bounded carpet continuation, offset center-left and turning out of sight. Join and seal all other wall masses so no second passage, slot, doorway, bay, alcove, or implied corridor reads as walkable. Exact landscape 4:3. Mostly empty. No text, UI, labels, arrows, people, entities, furniture, doors, windows, signs, landmarks, new level, dramatic horror, VHS, glitch, fisheye, bloom, or watermark.
```

### L0-0006C

Reference: `L0-0005A.png`, route `L0-0005A-P2`. Output: `exec-0cea3eb2-f1d5-4015-9883-c4087004c022.png`.

```text
Generate a brand-new adjacent Backrooms Level 0 scene for L0-0006C. The supplied image is a continuity reference only, not an edit target. The camera has walked only several meters through L0-0005A's SECOND route: the narrower RIGHT-side opening, not the broad left route. Show the immediately adjacent view after clearing that right opening. Preserve the brighter A-branch family: pale yellow-beige patterned wallpaper, taupe patterned low-pile carpet, dark vinyl base trim, acoustic ceiling grid, moderately bright flat fluorescent panels, standing eye height about 1.65 m, moderate 40 mm-equivalent lens, and late-1990s to mid-2000s budget consumer-digital photographic realism. Present exactly TWO visually traversable, tall, fully wall-bounded carpet openings at unequal depths and unequal screen weights: a broader primary opening curving ahead-right and a narrower secondary opening on the far left. Separate them with a continuous solid wall mass. Neither may hide or imply a third route. Close every other wall edge and bay. Exact landscape 4:3, strong asymmetry, no paired-door or menu composition. Mostly empty. No text, UI, labels, arrows, people, entities, furniture, doors, windows, signs, landmarks, new level, dramatic horror, VHS, glitch, fisheye, bloom, or watermark.
```

## L0-0001-C02

Default output: `exec-4d80ab31-63bd-4c47-9248-2b6197106649.png`

```text
Use case: photorealistic-natural
Asset type: playable web exploration scene candidate, scene L0-0001-C02
Primary request: Create a genuinely different original Level 0 starting space with two natural architectural movement paths.
Scene/backdrop: A mostly empty shallow former retail back-room or leased commercial suite, late-1980s/1990s construction. The camera faces an irregular wide room broken by one off-center L-shaped partition. One route is a broad continuation along the far-right wall into deeper space; the other is a nearer recessed opening on the left partly hidden by the short return of the partition. Avoid the room layout and partition geometry of a central corridor maze.
Style/medium: Photorealistic late-1990s to mid-2000s budget consumer digital-camera photograph, slight sensor grain and modest fluorescent color cast, not cinematic and not a 3D render.
Composition/framing: Exact landscape 4:3; standing human eye level about 1.65 m; moderate field of view around 40 mm equivalent; level camera. The branch occurs at unequal distances and unequal screen weights. No centered or symmetrical pair, no choice-door staging. Both routes should be architecturally clear and suitable for invisible polygon hit regions.
Lighting/mood: Flat fluorescent ceiling light with one mildly dimmer run; familiar, vacant, suspended, weakly unsettling; no dramatic darkness.
Color palette: Sickly cream-yellow walls, beige-brown commercial carpet, off-white acoustic tile ceiling and dull grid.
Materials/textures: Cheap painted drywall and faint wallpaper remnants, vinyl baseboard, worn low-pile carpet, plausible mismatched early-2000s maintenance.
Constraints: Original Level 0 identity, realistic architecture with subtle proportion or ceiling-grid errors, mostly empty; no text, watermark, people, entities, bodies, gore, weapons, occult imagery, brands, documents, luxury, futuristic elements, fantasy geometry, windows showing outdoors, extreme ruin, debris fields, strong VHS/glitch/CCTV/date overlays, fisheye, exaggerated wide angle, menu composition, two cards, portals, arrows, highlights, icons, UI, or readable wayfinding.
```

## L0-0001-C03

Default output: `exec-38aacfb4-6574-482e-b882-9c6e87eaa64f.png`

```text
Use case: photorealistic-natural
Asset type: playable web exploration scene candidate, scene L0-0001-C03
Primary request: Create a genuinely different original Level 0 starting scene with two unequal natural movement paths.
Scene/backdrop: A long but shallow yellow commercial service corridor widens unexpectedly into a carpeted transverse hall. The main architectural continuation bends gently left through the widened hall, visible at medium depth. A second movement path is a low-ceiling side passage tucked to the near right beneath an awkward lowered soffit, only partly visible. Use fewer freestanding partitions and more wall-height/ceiling change than the other concepts.
Style/medium: Photorealistic snapshot from a late-1990s to mid-2000s low-end consumer digital camera, restrained sensor noise, slight fluorescent white-balance error, limited dynamic range; not cinematic, not a render.
Composition/framing: Exact landscape 4:3 frame, standing eye level around 1.65 m, moderate 40 mm-equivalent field of view, level camera. Paths appear at different distances, scales, and screen locations; architecture alone makes both traversable. Neither is centered as the correct route and neither forms a symmetrical doorway choice.
Lighting/mood: Repetitive overhead fluorescent fixtures, mostly bright with the tucked side passage only slightly dimmer; empty, familiar, stagnant, subtly wrong.
Color palette: Yellowed cream wallpaper/paint, brown-beige low-pile carpet, nicotine off-white acoustic ceiling tiles and metal grid.
Materials/textures: Cheap drywall, vinyl cove base, mismatched soffit construction, damp-looking carpet edges, modest age and maintenance traces.
Constraints: Mostly empty, realistic late-20th-century commercial plausibility with weak proportion mistakes; no text or watermark, no people, entities, bodies, gore, combat, chase, occult symbols, brands, readable documents, futuristic architecture, luxury interior, fantasy forms, outdoors through windows, ruin, big debris, dramatic horror, strong glitch/VHS/CCTV/date overlay, fisheye, extreme wide angle, two identical doors, cards, portals, menu staging, UI, highlights, arrows, signs, icons, or glowing routes.
```

## L0-0001-C04

Default output: `exec-0bc55e3e-a92e-426a-9b37-f18be3d26aa3.png`

```text
Use case: photorealistic-natural
Asset type: playable web exploration scene candidate, scene L0-0001-C04
Primary request: Create a fourth, genuinely different original Level 0 starting environment with two architectural movement paths.
Scene/backdrop: A mostly empty former meeting-facility annex or office circulation bay. An offset rectangular support core occupies the middle distance. A relatively open route slips beyond its left edge into a deeper, slightly wider room. A narrower route passes behind a staggered half-height-to-full-height partition on the far right and turns out of sight. The branch is discovered through occlusion and layered depth rather than paired openings.
Style/medium: Photorealistic late-1990s to mid-2000s consumer digital-camera photograph with modest sensor grain, slight fluorescent white-balance contamination and limited highlight latitude; no cinematic look and no polished architectural rendering.
Composition/framing: Exact 4:3 landscape; standing eye level about 1.65 m; moderate field of view near 40 mm full-frame equivalent; level camera. Strong asymmetry, unequal route distance and visibility, no central vanishing-point hero route. Keep both path silhouettes readable enough for invisible responsive hit regions.
Lighting/mood: Repeated fluorescent drop-ceiling fixtures, softly uneven but not dramatic; familiar, vacant, paused, faintly uncanny; only weak structural wrongness.
Color palette: Aged cream-yellow walls, dull beige-brown commercial carpet, yellowed off-white ceiling tiles, gray-brown trim.
Materials/textures: Cheap 1990s commercial drywall and wallpaper, vinyl base, low-pile carpet, a few patched surfaces and inconsistent maintenance seams, no clutter.
Constraints: Original Level 0 scene, mostly empty, realistic construction with small errors in wall thickness, ceiling grid, or proportions; no text/watermark, people, creatures, corpses, gore, combat, chase, occult or religious symbols, brands, readable paperwork, futuristic design, luxury design, fantasy geometry, visible exterior, extreme decay, large debris, strong horror effects, VHS/CCTV/glitch/date overlays, fisheye, ultra-wide distortion, symmetrical doors, paired portals, menu/cards/UI, signs, arrows, icons, outlines, glow, or highlighted interactive objects.
```

## L0-0001-final refinement

Reference: `L0-0001-C03.png`. Default output: `exec-5f692f79-7b07-4ca9-b961-2405cea7a02e.png`

```text
Use case: precise-object-edit
Asset type: refined playable web exploration scene L0-0001-final
Input images: Image 1 is the edit target and provisional selected composition.
Primary request: Refine this exact scene into the production opening image. Preserve the architecture, camera position, 4:3 framing, left bending route, tucked right passage, central blocking wall, ceiling layout, and all route silhouettes. Change only the photographic and material finish: make the image read a little more like a late-1990s to mid-2000s budget consumer digital-camera photograph and a little less like a polished architectural render.
Style/medium: Photorealistic old consumer digital snapshot; restrained fine sensor noise, slight fluorescent white-balance error, limited dynamic range, mild uneven exposure.
Materials/textures: Add only subtle plausible wear, faint carpet compression, small wallpaper variation, modest maintenance mismatch, and weak damp discoloration near limited wall bases. Keep the room mostly clean and empty.
Lighting/mood: Preserve bright flat fluorescents; familiar, hollow, still, faintly unsettling; no dramatic horror.
Constraints: Change only surface realism and photographic character. Keep every wall, opening, partition, path shape, path position, ceiling height, perspective, camera height, moderate field of view, and composition unchanged. Exact landscape 4:3. Do not add or remove routes. No new doors, windows, objects, furniture, signs, text, people, creatures, bodies, gore, occult imagery, logos, documents, debris, strong damage, shadows, highlights, UI, arrows, glow, VHS/CCTV/glitch/date overlays, cinematic grading, fisheye, or wide-angle distortion.
```

## L0-0002A

Reference role: `L0-0001-final.png` is the continuity reference. Default output: `exec-4c42b93c-76ce-488a-89e8-26b67a61b8cb.png`

```text
Use case: photorealistic-natural
Asset type: playable follow-up scene L0-0002A
Input images: Image 1 is the architectural and photographic continuity reference, L0-0001-final. It is not the edit target; generate the immediately adjacent viewpoint after taking its left movement path L0-0001-P1.
Primary request: Show the camera just after walking through the broad left-side route and completing its gentle left turn, now facing forward along that continuation. This must feel like the same physical interior one movement later, not a generic similar room and not a teleport.
Continuity anchors from Image 1: Preserve the same human eye height, moderate lens, consumer-digital photographic character, yellow-cream wall finish, beige-brown carpet, dark vinyl base trim, acoustic drop-ceiling grid and fluorescent fixture type. Carry the curved/angled outer wall from the left route into the near left side; the former central blocking wall should logically become the near right wall after the turn. Continue the ceiling-grid direction and the receding line of fluorescent fixtures through the new view.
Spatial evolution: Advance only a few meters and rotate left with the route. Reveal one modest forward continuation deeper ahead, partly shaped by another offset wall; do not introduce a landmark or new facility type. Do not show the previous area behind the player or the discarded right path.
Style/medium: Photorealistic late-1990s to mid-2000s budget consumer digital-camera snapshot with restrained noise, limited dynamic range and slight fluorescent white-balance error.
Composition/framing: Exact landscape 4:3, standing eye level about 1.65 m, moderate 40 mm-equivalent field of view, level camera, forward-facing.
Lighting/mood: Bright flat fluorescents, familiar, hollow, still and weakly unsettling.
Constraints: Small direct-adjacent spatial change only. Mostly empty. No people, entities, bodies, gore, combat, occult imagery, text, logos, documents, windows showing outdoors, furniture clusters, luxury, futuristic forms, fantasy geometry, large debris, strong ruin, dramatic darkness, major landmark, new level, strong VHS/CCTV/glitch/date overlay, fisheye, UI, icons, arrows, glow, or highlighted route. Do not show the previous scene behind the camera.
```

## L0-0002B

Reference role: `L0-0001-final.png` is the continuity reference. Default output: `exec-e8cea16d-fbb4-4ce9-99b1-72eb299de4b1.png`

```text
Use case: photorealistic-natural
Asset type: playable follow-up scene L0-0002B
Input images: Image 1 is the architectural and photographic continuity reference, L0-0001-final. It is not the edit target; generate the immediately adjacent viewpoint after taking its tucked right movement path L0-0001-P2.
Primary request: Show the camera just after stepping into the narrow right-side passage beneath the lowered soffit and following its slight rightward turn, now facing forward inside that passage. This must be the same physical route one movement later, not a generic similar corridor and not a teleport.
Continuity anchors from Image 1: Preserve the low awkward soffit immediately overhead, the rounded inner wall now running along the near left, the straight outer wall on the near right, dark vinyl base trim, the same beige-brown carpet direction, acoustic ceiling system beyond the soffit, fluorescent fixture character, eye height, moderate lens, and consumer-digital photographic medium. The passage should remain somewhat narrower and slightly dimmer than the opening scene.
Spatial evolution: Advance only a few meters and rotate slightly right with the passage. Reveal one visually valid forward continuation where the narrow corridor opens a little beyond an offset wall. Do not show the previous room behind the player or the discarded left branch.
Style/medium: Photorealistic late-1990s to mid-2000s low-end consumer digital-camera snapshot with restrained fine noise, slight fluorescent white-balance error and limited dynamic range.
Composition/framing: Exact landscape 4:3, standing human eye level about 1.65 m, moderate 40 mm-equivalent field of view, level forward-facing camera.
Lighting/mood: Flat fluorescent light with the near soffit gently shadowed, still legible; compressed, familiar, quiet and faintly unsettling, no strong horror.
Constraints: Small direct-adjacent spatial change only. Mostly empty. No people, entities, bodies, gore, combat, occult imagery, text, logos, documents, windows showing outside, furniture clusters, luxury, futuristic forms, fantasy geometry, large debris, strong ruin, dramatic darkness, landmark, new facility category, new level, strong VHS/CCTV/glitch/date overlay, fisheye, UI, icons, arrows, glow, or highlighted route. Do not show the previous scene behind the camera.
```

## 0.2.0 branch-expansion operations

All operations below used the built-in `$imagegen` workflow with the immediately preceding scene as a local reference. The four new playable scenes and the corrected `L0-0002B` remain provisional until human canon review.

### L0-0002B continuity replacement

References: `L0-0001-final.png` and the previous `L0-0002B.png`. Default output: `exec-e9268777-c7cb-41f7-9dff-560bfe772241.png`.

```text
Preserve the existing corridor, walls, route, camera, materials, and lighting. Extend the awkward lowered soffit from the opening scene into the immediate foreground above the camera before the ordinary acoustic ceiling resumes. Keep the rounded left wall, straight right wall, compressed width, single forward route, 4:3 consumer-digital photographic character, and all exclusions from the Level 0 brief. Do not add text, UI, people, entities, doors, signs, landmarks, branches, or dramatic horror.
```

### L0-0003A

Reference: `L0-0002A.png`. Default output: `exec-bd813c6b-6d95-4ebc-b167-a937fec30a09.png`.

```text
Advance only a few meters through the single route around the offset wall. Preserve the curved left wall, right offset, carpet, trim, ceiling grid, fluorescent character, eye height, moderate lens, and 4:3 consumer-digital medium. Let the corridor become modestly wider and less curved while retaining one obvious forward-left path. No branch, landmark, new facility type, text, UI, people, entities, or dramatic horror.
```

### L0-0004A

Reference: `L0-0003A.png`. Default output: `exec-48cdafee-c676-4a78-8129-db7dad7a88f1.png`.

```text
Move through the existing route and pass the large offset with a gentle leftward flow. Reveal a moderately wider shallow circulation bay framed by near walls and one central offset, with exactly one forward continuation. Preserve the A-branch materials, ceiling grid, fluorescent line, camera height, lens, and 4:3 consumer-digital photographic character. No branch, landmark, level change, text, UI, people, entities, or dramatic horror.
```

### L0-0003B

Reference: corrected `L0-0002B.png`. Default output: `exec-a47015b9-a6b9-4454-be3d-7a091d3bfeb1.png`.

```text
Advance beneath the soffit transition and past the offset wall, turning only slightly right. Preserve the rounded left wall, constrained right side, narrow carpet channel, muted fluorescence, eye height, moderate lens, and 4:3 consumer-digital medium. The passage may open only slightly and must remain narrower and dimmer than the A branch, with one forward route. No branch, landmark, text, UI, people, entities, or dramatic horror.
```

### L0-0004B

Reference: `L0-0003B.png`. Initial output: `exec-a5405771-a844-41c5-8004-aac9908468af.png`. Exact-4:3 technical correction output and final saved asset: `exec-e2e42df2-cd04-4154-a440-660d114e502b.png`.

```text
Move a few meters through the narrow channel, passing the offset pier and following a gentle right bend. Carry staggered wall mass to the left after the turn, retain a curved outer wall on the right, and keep the corridor narrow, enclosed, and limited to one carpet route. Preserve Level 0 materials, muted light, eye height, moderate lens, and consumer-digital character. No branch, landmark, text, UI, people, entities, or dramatic horror.

Technical correction only: preserve the generated scene, composition, camera, geometry, lighting, textures, and single route while returning an exact landscape 4:3 raster. Add or remove no content.
```

## 0.5.0 A-branch single-route revisions

All three assets used the built-in `$imagegen` edit workflow. Each prompt treated the existing scene as the only edit target and adjacent scenes as fixed continuity references. The final outputs were copied directly into the stable scene URLs at 1448×1086.

### L0-0002A replacement

Output: `exec-1e100643-eab9-46f8-aee3-09991ac0d58a.png`.

```text
Use case: precise scene-geometry edit. Asset: replacement for playable scene L0-0002A. Image 1 is the only edit target; Images 2 and 3 are fixed previous/next continuity references. Make the existing forward-left route around the offset the only traversable corridor. Close the apparent right-side route with matching wallpapered wall, continuous base trim, and no carpet channel behind it. Preserve exact 4:3 framing, camera, Level 0 materials, lighting, texture, and the intended left passage. Make the smallest possible edit. No people, objects, text, symbols, doors, extra openings, T-junctions, side corridors, stairs, or surreal effects.
```

### L0-0003A replacement

Output: `exec-49b4d89c-efd2-4124-b266-e5f867cf5176.png`.

```text
Use case: precise scene-geometry edit. Asset: replacement for playable scene L0-0003A. Image 1 is the only edit target; Images 2 and 3 are fixed previous/next continuity references. Preserve the narrow forward-left passage between the curved left wall and broad offset as the only route. Close the broad right-side carpeted space with a matching wall mass and continuous base trim so it reads as a shallow sealed bay with a visible terminating wall. Preserve exact 4:3 framing, camera, Level 0 materials, lighting, texture, and the intended center-left passage. Make the smallest possible edit. No people, objects, text, symbols, doors, extra openings, T-junctions, side corridors, stairs, or surreal effects.
```

### L0-0004A replacement

Output: `exec-859ffaf0-24f0-4f5f-9367-c6d95602aedd.png`.

```text
Use case: precise scene-geometry edit. Asset: replacement for playable scene L0-0004A. Image 1 is the only edit target; Image 2 is the fixed previous-scene continuity reference. Preserve the existing right-side carpet passage as the only route. Join or overlap the central wall and near left framing wall as one continuous solid obstruction so no left-side gap or hidden path can be inferred. Preserve exact 4:3 framing, camera, Level 0 materials, lighting, texture, and the intended right passage. Make the smallest possible edit. No people, objects, text, symbols, doors, extra openings, T-junctions, side corridors, stairs, or surreal effects.
```

## 0.4.0 B-branch and transparent-boundary revisions

Both revisions used the built-in `$imagegen` workflow. The playable scene was generated directly from its two adjacent B-branch references. The symbol used a chroma-key edit followed by the skill-provided local alpha-removal script; the resulting project asset is an RGBA PNG.

### L0-0003B replacement

Direct source reference: `L0-0002B.png`. Downstream continuity reference: `L0-0004B.png`. Output and final saved asset: `exec-cea7b0bb-9d64-442a-9d82-bfea4d970931.png`, 1448×1086.

```text
Use case: photorealistic-natural
Asset type: replacement playable follow-up scene L0-0003B
Input images: Image 1 is the direct source scene L0-0002B after entering the compressed B passage. Image 2 is the fixed downstream scene L0-0004B and is only a continuity destination reference, not an edit target.
Primary request: Generate a genuinely progressed intermediate viewpoint one movement after Image 1 and one movement before Image 2. The camera has walked several meters past the near right-side pier from Image 1 and completed a clearer rightward bend, so the previous near pier and exact Image 1 composition are no longer repeated. Reveal a short staggered circulation pocket: a close wall mass now frames the left foreground, a shallow lateral recess is visible at mid-left, and one narrow traversable opening continues at medium depth toward the right-center, logically preparing the alternating left wall masses and curved right boundary seen in Image 2.
Continuity anchors: Preserve the same Level 0 yellow-beige wallpaper, patterned brown-beige carpet, dark vinyl base trim, acoustic ceiling grid, flat fluorescent fixture family, standing eye height, moderate lens, and late-1990s to mid-2000s budget consumer-digital photographic character. Keep the B branch compressed and dimmer than the A branch.
Spatial distinction: The new scene must be unmistakably different from Image 1 at a glance: no same corridor framing, no same central wall face, no same near-right pillar, and no composition that looks like a tiny forward crop. Show that the player has passed the obstacle and changed orientation. Still exactly one route, through a clearly bounded vertical opening at medium depth rather than a large carpet wedge.
Composition/framing: Exact landscape 4:3, level camera, approximately 40 mm full-frame equivalent, human eye height about 1.65 m. The single route opening should be visually legible as a tall architectural gap suitable for a polygon mask over the opening itself.
Lighting/mood: Muted flat fluorescent light, familiar, compressed, still and faintly unsettling; no dramatic darkness.
Constraints: Small direct-adjacent spatial change, not a teleport. Mostly empty. No branch, door, landmark, new facility type, new level, text, UI, people, entities, bodies, gore, occult imagery, documents, windows, furniture, debris, strong ruin, dramatic horror, VHS/CCTV/glitch overlay, fisheye, arrows, glow, or highlighted route.
```

### Transparent content-boundary symbol

Edit target: the original 0.3.0 symbol. Chroma output: `exec-c01f1385-5c29-4c52-83a3-e57b3c235119.png`. Post-process: `remove_chroma_key.py --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill`. Final saved asset: `content-boundary-symbol.png`, RGBA 1448×1086.

```text
Use case: background-extraction
Asset type: transparent content-boundary glyph source
Input images: Image 1 is the exact symbol edit target.
Primary request: Preserve the exact off-white impossible rectilinear floor-plan knot from Image 1—same shape, line thickness, scale, centered position, worn material texture, and 4:3 canvas—but replace only the black background with a perfectly flat solid #00ff00 chroma-key background for local removal.
Scene/backdrop: One uniform #00ff00 field with no shadows, gradients, vignette, texture, reflections, lighting variation, or black remnants.
Subject: The existing off-white worn glyph only.
Composition/framing: Exact landscape 4:3; glyph remains centered at the same size with generous empty margin.
Constraints: Change only the background. Keep the glyph fully opaque with crisp antialiased edges. Do not use #00ff00 inside the glyph. No cast shadow, glow, halo, border, text, watermark, additional marks, or restyling.
```

## 0.3.0 content-boundary operations

Both assets below used the built-in `$imagegen` workflow as independent generations. They are provisional boundary assets, not new playable Level 0 scenes. The generated PNGs were copied without raster edits into `public/boundary/`.

### Content-boundary symbol

Default output: `exec-6cde1dd4-b40d-40e1-93e7-d7bc4401dbe4.png`. Saved project asset: `content-boundary-symbol.png`, 1448×1086.

```text
Create an exact landscape 4:3 content-boundary screen for a UI-free Backrooms web exploration. Use a pure matte-black field with one centered, large but isolated off-white symbol. The symbol is an original impossible rectilinear floor-plan knot: thick right-angle corridors overlap and return into themselves without becoming letters, numbers, a logo, a maze puzzle, an occult mark, or a known icon. Give the pale line work a faint worn plaster or carpet-fiber texture and imperfect age, but keep the silhouette sharply readable and the surrounding black completely empty. No text, border, interface, buttons, arrows, glow, gradients, scenery, people, entities, watermark, or additional marks.
```

### Reset epilogue

Default output: `exec-62a18e0a-bd69-4b93-8ec1-a1a6751b5284.png`. Saved project asset: `reset-epilogue.png`, 1448×1086.

```text
Create an exact landscape 4:3 photorealistic final image for a Level 0 Backrooms exploration. A short, empty yellow commercial corridor ends at a flat dead wall. The brown-beige low-pile carpet continues forward and then bends seamlessly upward across the entire dead wall like one continuous material, removing every traversable route while remaining physically photographed rather than surreal illustration. Preserve late-1980s/1990s low-cost commercial materials, off-white acoustic ceiling tiles, one flat fluorescent fixture, dark vinyl base trim on the side walls, standing eye height, moderate lens, and a restrained late-1990s to mid-2000s consumer digital-camera character. Familiar, hollow, still, and quietly impossible; no dramatic horror. No openings, doors, text, signs, symbols, UI, people, entities, bodies, gore, objects, windows, exterior, arrows, glow, glitch, VHS overlay, fisheye, watermark, or cinematic grading.
```

## 0.6.0 five-scene automation pilot

All five assets used built-in `$imagegen` generation mode. Each preceding playable scene was a fixed architectural and photographic continuity reference, not an edit target. The generated outputs were copied into stable project URLs without deleting the original generated files.

### L0-0005A

Reference: `L0-0004A.png`. Output: `exec-7381a83e-3bb1-4729-9e0c-46755df1f28e.png`.

```text
Use case: photorealistic-natural
Asset type: playable Backrooms follow-up scene L0-0005A
Input images: Image 1 is the fixed architectural and photographic continuity reference L0-0004A; it is not an edit target.
Primary request: Generate the immediately adjacent viewpoint after walking through Image 1's visible right-side passage. The camera advances only several meters, clears the near wall mass, and enters a modest Level 0 circulation pocket. Present exactly two visually obvious, fully bounded walkable openings: a broad primary continuation bending gently forward-left and a distinctly narrower secondary continuation on the right. Both openings must be tall architectural gaps with visible carpet continuing through them and must not overlap.
Continuity anchors: same yellow-beige wallpaper, patterned beige-brown low-pile carpet, dark vinyl base trim, acoustic ceiling grid, flat fluorescent fixtures, standing eye height, moderate 40 mm-equivalent lens, late-1990s to mid-2000s budget consumer-digital snapshot character.
Composition/framing: exact landscape 4:3, level camera, human eye height about 1.65 m, modest forward movement, same facility.
Lighting/mood: flat fluorescent light, familiar, hollow, still, faintly unsettling; no dramatic horror.
Constraints: Mostly empty. The two declared openings are the only passage-like gaps. No hidden carpet channel behind a freestanding central wall, no third opening, no door, no stairs, no landmark, no previous room behind the camera, no new level, text, UI, arrows, highlights, people, entities, bodies, gore, occult imagery, windows, furniture, debris, heavy ruin, cinematic grading, VHS/CCTV/glitch overlay, fisheye, ultra-wide distortion, logo, or watermark.
```

### L0-0005B

Reference: `L0-0004B.png`. Output: `exec-defd302a-48ed-455a-9366-ad698dd32f45.png`.

```text
Use case: photorealistic-natural
Asset type: playable Backrooms follow-up scene L0-0005B
Input images: Image 1 is the fixed architectural and photographic continuity reference L0-0004B; it is not an edit target.
Primary request: Generate the immediately adjacent viewpoint after walking through Image 1's narrow center passage. The camera advances only several meters past the alternating left wall mass and follows the curved right boundary into a compressed Level 0 corridor. Show one clear forward continuation bending slightly left at medium depth. The route should be a tall wall-bounded opening with carpet visibly continuing through it.
Continuity anchors: same yellow-beige wallpaper, patterned beige-brown low-pile carpet, dark vinyl base trim, acoustic ceiling grid, muted flat fluorescent fixtures, standing eye height, moderate 40 mm-equivalent lens, late-1990s to mid-2000s budget consumer-digital snapshot character. Keep the B branch narrower and dimmer than A.
Composition/framing: exact landscape 4:3, level camera, human eye height about 1.65 m, small direct-adjacent movement.
Lighting/mood: muted flat fluorescence, compressed, familiar, quiet and faintly unsettling; no dramatic darkness.
Constraints: Mostly empty. Aim for one obvious route, but do not fake or conceal any passage that the architecture naturally shows. Avoid freestanding central walls with floor visible on both sides. No door, stairs, landmark, previous room, new level, text, UI, arrows, highlights, people, entities, bodies, gore, occult imagery, windows, furniture, debris, heavy ruin, cinematic grading, VHS/CCTV/glitch overlay, fisheye, ultra-wide distortion, logo, or watermark.
```

### L0-0006A

Reference: `L0-0005A.png`. Output: `exec-98f26328-654a-495b-9f97-8b35f7c482b6.png`.

```text
Use case: photorealistic-natural
Asset type: playable Backrooms follow-up scene L0-0006A
Input images: Image 1 is the fixed architectural and photographic continuity reference L0-0005A; it is not an edit target.
Primary request: Generate the immediately adjacent viewpoint after walking through Image 1's broad left opening. The camera moves only several meters around that gentle left bend into a quieter Level 0 corridor. Show exactly one visually obvious, fully bounded walkable continuation at medium depth, bending gently right. It must be a tall architectural opening with the same carpet visibly continuing through it.
Continuity anchors: same pale yellow-beige patterned wallpaper, taupe patterned low-pile carpet, dark brown vinyl base trim, acoustic ceiling grid, rectangular fluorescent panels, standing eye height, moderate 40 mm-equivalent lens, late-1990s to mid-2000s budget consumer-digital snapshot character. Preserve the brighter and broader A-branch feel without making the space grand.
Composition/framing: exact landscape 4:3, level camera, human eye height about 1.65 m, direct adjacent-room progression with modest forward movement.
Lighting/mood: flat familiar fluorescent light, empty, hollow, still, faintly unsettling; no dramatic horror.
Constraints: Mostly empty. The declared forward continuation is the only passage-like gap. Use continuous wall masses so there is no hidden floor channel around a pillar or freestanding partition. No second opening, third opening, door, stairs, landmark, previous room behind camera, new level, text, UI, arrows, highlights, people, entities, bodies, gore, occult imagery, windows, furniture, debris, heavy ruin, cinematic grading, VHS/CCTV/glitch overlay, fisheye, ultra-wide distortion, logo, or watermark.
```

### L0-0006B

Reference: `L0-0005B.png`. Output: `exec-3dc01a6c-6797-4cfb-9635-bcb8d1345b71.png`.

```text
Use case: photorealistic-natural
Asset type: playable Backrooms follow-up scene L0-0006B
Input images: Image 1 is the fixed architectural and photographic continuity reference L0-0005B; it is not an edit target.
Primary request: Generate the immediately adjacent viewpoint after following Image 1's only narrow forward route around its slight left bend. The camera moves only several meters into a small compressed Level 0 junction. Present exactly two visually obvious and fully bounded walkable openings: a narrow primary continuation ahead-left and a secondary opening on the right that begins closer to the camera. Both must be tall wall-bounded gaps with carpet visibly continuing through them, separated by a solid wall corner, and neither may overlap or hide another route.
Continuity anchors: same pale yellow-beige patterned wallpaper, taupe patterned low-pile carpet, dark brown vinyl base trim, acoustic ceiling grid, muted rectangular fluorescent panels, standing eye height, moderate 40 mm-equivalent lens, late-1990s to mid-2000s budget consumer-digital snapshot character. Keep the B branch tighter and slightly dimmer than A.
Composition/framing: exact landscape 4:3, level camera, human eye height about 1.65 m, direct adjacent-room progression with modest forward movement.
Lighting/mood: muted flat fluorescence, compressed, familiar, quiet and faintly unsettling; no dramatic darkness.
Constraints: Mostly empty. The two declared openings are the only passage-like gaps. No carpet visible behind a freestanding central wall, no third opening, no door, stairs, landmark, previous room, new level, text, UI, arrows, highlights, people, entities, bodies, gore, occult imagery, windows, furniture, debris, heavy ruin, cinematic grading, VHS/CCTV/glitch overlay, fisheye, ultra-wide distortion, logo, or watermark.
```

### L0-0007A

Reference: `L0-0006A.png`. Output: `exec-56069300-06cc-4cf2-a073-c5cf1a95a131.png`.

```text
Use case: photorealistic-natural
Asset type: playable Backrooms follow-up scene L0-0007A
Input images: Image 1 is the fixed architectural and photographic continuity reference L0-0006A; it is not an edit target.
Primary request: Generate the immediately adjacent viewpoint after walking through Image 1's single centered opening and following its gentle rightward curve. Move the camera only several meters into a slightly narrower Level 0 corridor chamber. Show exactly one visually obvious, fully bounded walkable continuation at medium depth, offset toward the left and bending out of sight. It must be a tall architectural gap with the same carpet visibly continuing through it.
Continuity anchors: same pale yellow-beige patterned wallpaper, taupe patterned low-pile carpet, dark brown vinyl base trim, acoustic ceiling grid, rectangular fluorescent panels, standing eye height, moderate 40 mm-equivalent lens, late-1990s to mid-2000s budget consumer-digital snapshot character. Retain the moderately bright A-branch character but introduce only subtle spatial variation.
Composition/framing: exact landscape 4:3, level camera, human eye height about 1.65 m, direct adjacent-room progression with modest forward movement.
Lighting/mood: flat fluorescent light, familiar, hollow, empty, still, faintly unsettling; no dramatic horror.
Constraints: Mostly empty. The declared left-offset continuation is the only passage-like gap. Use continuous wall masses so no hidden floor channel appears around a pillar or freestanding partition. No second opening, third opening, door, stairs, landmark, previous room behind camera, new level, text, UI, arrows, highlights, people, entities, bodies, gore, occult imagery, windows, furniture, debris, heavy ruin, cinematic grading, VHS/CCTV/glitch overlay, fisheye, ultra-wide distortion, logo, or watermark.
```

## 0.8.0 human-gated five-scene batch

### L0-0007B

Reference: `L0-0006B.png`. Candidate output: `exec-777c3695-c3df-4d28-ab6d-0dae7b63c9e0.png`. This image remains staged until its visible routes are manually annotated.

```text
Use case: photorealistic-natural
Asset type: playable Backrooms follow-up candidate L0-0007B
Input images: Image 1 is the fixed architectural, material, and photographic continuity reference L0-0006B; it is not an edit target.
Primary request: Generate a brand-new immediately adjacent viewpoint after walking through Image 1's narrow ahead-left passage. Advance the camera only several meters and clear the near wall. The result must feel like the next physical space, not a restaging of Image 1. Show exactly one visually obvious, fully bounded walkable continuation at medium depth, curving gently to the right and out of sight, with the same carpet visibly continuing through it.
Continuity anchors: preserve pale yellow-beige patterned wallpaper, taupe patterned low-pile carpet, dark brown vinyl base trim, acoustic ceiling grid, muted rectangular fluorescent panels, standing human eye height about 1.65 m, moderate 40 mm-equivalent lens, late-1990s to mid-2000s budget consumer-digital photographic realism. Keep this B branch tighter, dimmer, and more compressed than the A branch.
Spatial variation: a short narrow corridor with one continuous offset wall creating the rightward bend; do not repeat Image 1's two-opening junction or central wall composition.
Composition/framing: exact landscape 4:3 canvas, level camera, modest forward movement, no black borders.
Lighting/mood: muted flat fluorescent light, empty, familiar, hollow, still, faintly unsettling; no dramatic horror or dramatic darkness.
Constraints: The declared right-curving continuation is the only passage-like gap. All other walls must connect continuously to walls or image boundaries so no side slot, hidden floor channel, bay, alcove, doorway, second route, or implied corridor reads as walkable. Mostly empty. No freestanding partition, pillar with floor visible on both sides, door, stairs, landmark, previous room visible behind the camera, new level, text, UI, arrows, colored overlays, people, entities, bodies, gore, occult imagery, windows, furniture, debris, heavy ruin, cinematic grading, VHS/CCTV/glitch overlay, fisheye, ultra-wide distortion, bloom, logo, or watermark.
```

### L0-0008A

Reference: `L0-0007A.png`. Candidate output: `exec-d5919c6a-8d75-4c89-84f5-af82831d819c.png`. This image remains staged until its visible routes are manually annotated.

```text
Use case: photorealistic-natural
Asset type: playable Backrooms follow-up candidate L0-0008A
Input images: Image 1 is the fixed architectural, material, and photographic continuity reference L0-0007A; it is not an edit target.
Primary request: Generate a brand-new immediately adjacent viewpoint after walking through Image 1's only tall left-side opening and following that corridor several meters around its gentle left bend. The result must feel like the next physical space, not a restaging of Image 1. Show exactly one visually obvious, fully bounded walkable continuation at medium depth, offset toward the right and bending out of sight, with the same carpet clearly continuing through it.
Continuity anchors: preserve pale yellow-beige patterned wallpaper, taupe patterned low-pile carpet, dark brown vinyl base trim, acoustic ceiling grid, simple rectangular fluorescent panels, standing human eye height about 1.65 m, moderate 40 mm-equivalent lens, late-1990s to mid-2000s budget consumer-digital photographic realism, moderately bright A-branch character.
Spatial variation: slightly longer and narrower than Image 1, with one broad continuous wall mass creating an asymmetric rightward continuation; avoid repeating Image 1's exact doorway shape or composition.
Composition/framing: exact landscape 4:3 canvas, level camera, modest forward movement, no black borders.
Lighting/mood: flat fluorescent light, empty, familiar, hollow, still, faintly unsettling; no dramatic horror.
Constraints: The declared right-offset continuation is the only passage-like gap. All other wall masses must connect continuously to walls or image boundaries so no hidden floor channel, side slot, bay, alcove, doorway, second route, or implied corridor reads as walkable. Mostly empty. No freestanding partition, door, stairs, landmark, previous room visible behind the camera, new level, text, UI, arrows, colored overlays, people, entities, bodies, gore, occult imagery, windows, furniture, debris, heavy ruin, cinematic grading, VHS/CCTV/glitch overlay, fisheye, ultra-wide distortion, bloom, logo, or watermark.
```

## 0.9.0 twenty-candidate cycle — first review wave

The first review wave reuses the two staged candidates above and adds eight connected candidates. Every request used the referenced source raster as continuity context, requested an exact 4:3 photorealistic image, kept the camera near 1.65 m with a moderate roughly 40 mm-equivalent view, and preserved pale yellow-beige wallpaper, taupe patterned low-pile carpet, dark vinyl base trim, acoustic ceiling tiles, flat fluorescent lighting, and restrained late-1990s to mid-2000s consumer-digital realism. All outputs exclude text, UI, route overlays, people, entities, gore, furniture, windows, stairs, dramatic horror, cinematic grading, VHS/glitch effects, fisheye distortion, logos, and watermarks.

These are generated candidates, not accepted route annotations. The requested route count records generation intent; the human polygons record what the image actually contains.

### L0-0004E

Reference: `L0-0003C.png`, source path `L0-0003C-P1`. Output: `exec-a20fe296-67c6-4f1d-9628-9a836f2ce098.png`.

```text
Generate the immediately adjacent viewpoint after following the source passage around its left-curving carpet. Advance only several meters past the center pier. Create one fully bounded, clearly walkable continuation turning right at medium depth, with carpet continuing through it. All other wall masses must close continuously so no side slot, hidden floor channel, second opening, doorway, or implied corridor reads as traversable. Do not restage the source composition.
```

### L0-0005D

Reference: `L0-0004C.png`, source path `L0-0004C-P1`. Output: `exec-507996b9-d7a8-4d0a-bf49-b1918b952118.png`.

```text
Generate the immediately adjacent space after crossing the source image's centered opening. Advance a few meters into a quiet offset chamber closed on three sides. Show exactly one fully bounded left-side continuation with visible carpet leading through it. Avoid freestanding partitions, floor visible on both sides of a wall, extra recesses, and any second route.
```

### L0-0005E

Reference: `L0-0004D.png`, source path `L0-0004D-P1`. Output: `exec-9ae8b634-27e5-49c9-bb10-50b32511c781.png`.

```text
Generate the next viewpoint after walking through the source image's left opening. The compressed corridor opens into a small junction with exactly two fully bounded walkable passages: one broad left continuation and one narrower right continuation. Separate them with a solid wall mass and show carpet continuing into both. No overlapping openings, hidden route around the separating wall, third passage, or doorway.
```

### L0-0005F

Reference: `L0-0004D.png`, source path `L0-0004D-P2`. Output: `exec-80b688fd-8fb6-4158-9fe2-710fa1530725.png`.

```text
Generate the immediately adjacent viewpoint after entering the source image's right opening. Contract the space into a narrow Level 0 corridor that bends left and out of sight. The leftward continuation is the only passage-like gap. Connect every other wall mass to a wall or image boundary and avoid side slots, alcoves, freestanding partitions, and a second route.
```

### L0-0006D

Reference: `L0-0005C.png`, source path `L0-0005C-P1`. Output: `exec-cf226c6a-c7ed-4f24-bf3b-a9fd252356f6.png`.

```text
Generate the next physical space after following the source image's left passage. Advance around a broad center-right wall and show one clear leftward carpet continuation at medium depth. Keep the opposite edge visually closed with continuous architecture and do not create a second route. Preserve modest asymmetry and avoid copying the source view.
```

Human-review note: the generated right image edge may also read as traversable. The reviewer must decide from the visible floor and wall continuity whether this image contains one or two actual routes; generation intent must not override the image.

### L0-0007C

Reference: `L0-0006C.png`, source path `L0-0006C-P1`. Output: `exec-6250da9b-39b1-4547-a585-723293c0b498.png`.

```text
Generate the next viewpoint after entering the source image's small left opening. Let the path broaden into a smooth curved wall sequence and terminate visually in exactly one narrow, fully bounded opening at medium depth. Carpet must continue into that opening; every other boundary remains closed and attached.
```

### L0-0007D

Reference: `L0-0006C.png`, source path `L0-0006C-P2`. Output: `exec-cb0461dd-1a38-4156-a876-d9219004e218.png`.

```text
Generate the adjacent room after moving through the source image's broad right opening. Create a brighter Level 0 junction with exactly two clearly separated, fully framed walkable openings and visible carpet entering both. A solid center wall must separate the openings. Do not create a third floor channel, overlapping portal, doorway, or hidden path around the wall.
```

### L0-0007E

Reference: `L0-0006B.png`, source path `L0-0006B-P2`. Output: `exec-76ccd680-8534-4bab-8fb1-2d353da72b5f.png`.

```text
Generate the immediately adjacent viewpoint after taking the source image's broad right-side opening. Contract it into one subdued corridor curving right around an offset wall pier. The right-curving carpet continuation is the only walkable route. Close all other walls continuously and avoid side bays, slots, freestanding masses, doorways, or extra openings.
```

## 0.9.1 spatial-first correction for wave 2

The first wave over-weighted exact route-count language. Repeated instructions such as “exactly one fully bounded opening” caused the generator to converge on the same narrow corridor, flat wall, and tall rectangular gap even when the source branches differed. Those ten reviewed images remain valid connected scenes; replacing them after annotation would invalidate the human polygons.

Wave 2 therefore uses `production/spatial-variation-policy.json`. A prompt must first select a spatial scale, archetype, three-layer depth composition, camera position, and ceiling variation. Route-count wording is added only after that spatial shell is fixed, and it describes interaction readability rather than the room's entire shape. Across ten images, at least seven spatial archetypes must appear, at least six scenes must be room-, hall-, or open-scale, and no more than two narrow corridor scenes may occur consecutively.

The preferred route vocabulary also expands beyond doorway-shaped rectangles: carpet continuing around a broad corner, a wide bay between attached wall masses, a transverse hall, and a partially occluded continuation can all be valid. Human polygons—not requested count—remain the final record of what the generated image actually contains.
