# Human-gated scene production

The production loop is image-first and depth-first. It exposes only one generated candidate at a time because the next path does not exist until a person has inspected the image and drawn every visible route.

1. Select the deepest human-confirmed pending frontier.
2. Generate one adjacent 4:3 scene using the current scene as a continuity reference.
3. Store the output in `public/scenes/<scene-id>/candidates/` and register it in `public/scenes/staging-scenes.json`.
4. Open the local editor with `?dev=1&scene=<scene-id>` and draw every visible route. Finishing a polygon saves immediately.
5. The server changes the candidate to `ready-for-promotion`; it is still not playable canon.
6. Promotion registers the scene, path masks, new production frontiers, generation provenance, and the source path connection together.
7. Repeat from the selected continuation until the batch reaches five promoted scenes, then stop for a complete playtest.

`npm run production:status` reports the active candidate, confirmed alternative frontiers, and every frontier still blocked on human annotation or route reconciliation. Four-or-more-route scenes are never selected automatically without a separate rarity approval.

## GitHub Pages editor

Append `?dev=1&scene=<scene-id>` to the deployed Pages URL to open the hidden editor. Pages is static and cannot write into the repository, so edits are automatically preserved in that browser instead of being posted to the local Node server. The `JSON ↓` control or `Ctrl+Shift+E` exports the current annotations for promotion into the repository. Regular visitors who do not use the `dev=1` query parameter see only the exploration site.

Run `npm run preview:pages` after `npm run build` to test the same project-subpath behavior locally at `http://127.0.0.1:4181/backrooms-vertical-slice/`.
