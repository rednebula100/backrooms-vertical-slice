# Human-gated scene production

The production loop is image-first and depth-first, but the review UI is a multi-item queue. Several independent frontiers can have generated candidates at the same time. Only candidates that depend on a newly generated scene remain sequential because their next source path does not exist until a person annotates the new image.

1. Select the deepest human-confirmed pending frontier.
2. Generate one adjacent 4:3 scene using the current scene as a continuity reference.
3. Store the output in `public/scenes/<scene-id>/candidates/` and register it in `public/scenes/staging-scenes.json`.
4. Open the editor with `?dev=1&scene=<scene-id>` and draw every visible route. Finishing a polygon saves immediately but does not approve it.
5. Click `검수 완료` to record the explicit human decision. The editor advances to the next unreviewed item. The candidate then becomes `ready-for-promotion`; it is still not playable canon.
6. Promotion registers the scene, path masks, new production frontiers, generation provenance, and the source path connection together.
7. Repeat from the selected continuation until the batch reaches five promoted scenes, then stop for a complete playtest.

The queue also includes existing frontier scenes that have not been human-confirmed, so a reviewer can clear several items without searching the full connection tree. Edit mode always shows editable polygons. Click-test mode hides them by default and provides `영역 보기` only as a diagnostic overlay. `npm run production:status` reports every active candidate, confirmed alternative frontier, and frontier still blocked on human annotation or route reconciliation. Four-or-more-route scenes are never selected automatically without a separate rarity approval.

## GitHub Pages editor

Append `?dev=1&scene=<scene-id>` to the deployed Pages URL to open the hidden editor. Pages is static and cannot write into the repository, so edits are automatically preserved in that browser instead of being posted to the local Node server. The `JSON ↓` control or `Ctrl+Shift+E` exports the current annotations for promotion into the repository. Regular visitors who do not use the `dev=1` query parameter see only the exploration site.

Run `npm run preview:pages` after `npm run build` to test the same project-subpath behavior locally at `http://127.0.0.1:4181/backrooms-vertical-slice/`.
