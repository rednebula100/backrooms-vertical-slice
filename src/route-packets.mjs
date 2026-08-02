import { createHash } from "node:crypto";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function polygonBounds(points, asset, paddingRatio = 0.14) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padding = Math.max(maxX - minX, maxY - minY) * paddingRatio;
  const left = Math.max(0, Math.floor(minX - padding));
  const top = Math.max(0, Math.floor(minY - padding));
  const right = Math.min(asset.width, Math.ceil(maxX + padding));
  const bottom = Math.min(asset.height, Math.ceil(maxY + padding));
  return { left, top, width: right - left, height: bottom - top };
}

function centroid(points) {
  return points.reduce((value, [x, y]) => ({ x: value.x + x / points.length, y: value.y + y / points.length }), { x: 0, y: 0 });
}

function screenRoles(scene, annotation) {
  const entries = annotation.masks
    .filter((mask) => mask.sourcePathId)
    .map((mask) => ({ pathId: mask.sourcePathId, center: centroid(mask.regions.desktop) }))
    .sort((first, second) => first.center.x - second.center.x || first.center.y - second.center.y);
  const roles = new Map();
  for (const [index, entry] of entries.entries()) {
    let role = "center";
    if (entries.length > 1) {
      if (index === 0) role = "leftmost";
      else if (index === entries.length - 1) role = "rightmost";
      else role = `middle-${index}`;
    } else if (entry.center.x < scene.asset.width * 0.4) role = "left";
    else if (entry.center.x > scene.asset.width * 0.6) role = "right";
    roles.set(entry.pathId, role);
  }
  return roles;
}

export function routeMaskFingerprint(mask) {
  return createHash("sha256").update(JSON.stringify(mask.regions)).digest("hex");
}

function buildPrompt(scene, path, packet, otherPathIds) {
  const relation = packet.transitionRelation === "same-space-advance"
    ? "Remain inside the same physical room and advance to a new viewpoint; do not replace it with an unrelated room."
    : "Pass completely through the selected opening into its immediately adjacent space; the unchosen route belongs to a different branch.";
  return `Use case: photorealistic-natural
Asset type: playable Backrooms Level 0 transition candidate ${packet.targetSceneId}
Input images: Image 1 is the clean source scene ${scene.id}; Image 2 is a route-selection diagram where green marks only ${path.id} and red marks forbidden routes; Image 3 is a clean close crop of ${path.id}. All three are references, not edit targets. Never reproduce colored overlays.
Primary request: Generate the camera viewpoint immediately after the player follows ${path.id}, the ${packet.screenRole} human-confirmed route in Image 1. ${relation}
Camera transition: ${packet.cameraTransition.instruction}; move approximately ${packet.cameraTransition.distanceMeters} meters; finish ${packet.cameraTransition.targetView}.
Continuity invariants: ${packet.continuityAnchors.join("; ")}.
Spatial variation: ${packet.spatialBrief.intensity} intensity, ${packet.spatialBrief.archetype}; ${packet.spatialBrief.instruction}.
Route guard: Follow only ${path.id}. Do not enter, borrow geometry from, or restage ${otherPathIds.join(", ") || "any other route"}. Do not show the previous room behind the camera. Do not invent a discontinuous threshold.
Style/medium: photorealistic late-1990s to mid-2000s budget consumer-digital photograph; pale yellow-beige wallpaper, taupe patterned low-pile carpet, dark vinyl base trim, acoustic ceiling grid, flat fluorescent light; standing eye height about 1.65 m; moderate 40 mm-equivalent lens.
Composition/framing: exact landscape 4:3; a direct adjacent viewpoint with believable parallax and preserved wall thickness; spatial change should feel ${packet.spatialBrief.intensity}, not like a showcase of novelty.
Constraints: mostly empty; no text, UI, route colors, labels, arrows, people, entities, furniture, doors added without source support, windows, stairs, landmarks, dramatic horror, cinematic grading, VHS, glitch, fisheye, bloom, logo, or watermark.`;
}

export function buildRoutePacketRegistry(world, annotations, overrides, { sceneIds = null, updatedAt = new Date().toISOString() } = {}) {
  const scenes = new Map(world.scenes.map((scene) => [scene.id, scene]));
  const annotationById = new Map(annotations.scenes.map((record) => [record.sceneId, record]));
  const selected = sceneIds ? new Set(sceneIds) : null;
  const packets = [];

  for (const [sceneId, sceneOverride] of Object.entries(overrides.scenes ?? {})) {
    if (selected && !selected.has(sceneId)) continue;
    const scene = scenes.get(sceneId);
    const annotation = annotationById.get(sceneId);
    if (!scene || !annotation) throw new Error(`Route packet source is missing: ${sceneId}`);
    if (annotation.annotationStatus !== "masks-confirmed") throw new Error(`Route packet source is not human-confirmed: ${sceneId}`);
    const roles = screenRoles(scene, annotation);
    const maskByPath = new Map(annotation.masks.map((mask) => [mask.sourcePathId, mask]));
    const configuredPathIds = Object.keys(sceneOverride.paths ?? {});
    for (const pathId of configuredPathIds) {
      const path = scene.paths.find((candidate) => candidate.id === pathId);
      const mask = maskByPath.get(pathId);
      const pathOverride = sceneOverride.paths[pathId];
      if (!path || !mask) throw new Error(`Route packet path or confirmed mask is missing: ${pathId}`);
      const targetScene = scenes.get(pathOverride.targetSceneId);
      const consumed = path.status === "active"
        && path.targetSceneId === pathOverride.targetSceneId
        && targetScene?.sourcePathId === path.id;
      const outputDirectory = `/scenes/${scene.id}/route-packets`;
      const packet = {
        id: `RP-${path.id}`,
        sourceSceneId: scene.id,
        sourcePathId: path.id,
        sourceSpaceId: sceneOverride.sourceSpaceId,
        targetSceneId: pathOverride.targetSceneId,
        targetSpaceId: pathOverride.targetSpaceId,
        transitionRelation: pathOverride.transitionRelation,
        generationStatus: consumed ? "consumed" : pathOverride.generationStatus ?? "ready",
        screenRole: roles.get(path.id),
        movementType: path.movementType,
        maskFingerprint: routeMaskFingerprint(mask),
        mask: clone(mask.regions.desktop),
        cropBox: polygonBounds(mask.regions.desktop, scene.asset),
        references: {
          cleanSource: scene.image,
          routeMap: `${outputDirectory}/${path.id}-route-map.png`,
          routeCrop: `${outputDirectory}/${path.id}-route-crop.png`,
        },
        cameraTransition: clone(pathOverride.cameraTransition),
        continuityAnchors: clone(pathOverride.continuityAnchors),
        spatialBrief: clone(pathOverride.spatialBrief),
        forbiddenSourcePathIds: scene.paths.map((candidate) => candidate.id).filter((candidate) => candidate !== path.id),
        promptRecord: pathOverride.promptRecord
          ?? `docs/generation-prompts.md#${path.id.toLowerCase()}-route-packet-pilot`,
      };
      packet.prompt = buildPrompt(scene, path, packet, packet.forbiddenSourcePathIds);
      packets.push(packet);
    }
  }

  packets.sort((first, second) => first.sourcePathId.localeCompare(second.sourcePathId));
  return {
    schemaVersion: 1,
    worldVersion: world.worldVersion,
    updatedAt,
    policy: {
      selectedMaskIsAuthoritative: true,
      unselectedRoutesAreForbidden: true,
      directViewpointAfterMovement: true,
      spatialVariationPolicy: "production/spatial-variation-policy.json",
    },
    packets,
  };
}

export function validateRoutePacketRegistry(world, annotations, registry) {
  const errors = [];
  if (registry?.worldVersion !== world.worldVersion) errors.push("Route-packet world version must match the scene registry");
  if (!Array.isArray(registry?.packets)) return [...errors, "Route-packet registry must contain packets"];
  const scenes = new Map(world.scenes.map((scene) => [scene.id, scene]));
  const annotationById = new Map(annotations.scenes.map((record) => [record.sceneId, record]));
  const packetIds = new Set();
  const sourcePaths = new Set();
  for (const packet of registry.packets) {
    if (!packet.id || packetIds.has(packet.id)) errors.push(`Duplicate or missing route packet ${packet.id ?? "unknown"}`);
    packetIds.add(packet.id);
    if (!packet.sourcePathId || sourcePaths.has(packet.sourcePathId)) errors.push(`Duplicate or missing route-packet source ${packet.sourcePathId ?? "unknown"}`);
    sourcePaths.add(packet.sourcePathId);
    const scene = scenes.get(packet.sourceSceneId);
    const path = scene?.paths.find((candidate) => candidate.id === packet.sourcePathId);
    const targetScene = scenes.get(packet.targetSceneId);
    const annotation = annotationById.get(packet.sourceSceneId);
    const mask = annotation?.masks.find((candidate) => candidate.sourcePathId === packet.sourcePathId);
    if (!scene || !path) errors.push(`Route packet ${packet.id} source path is missing`);
    if (!mask || annotation.annotationStatus !== "masks-confirmed") errors.push(`Route packet ${packet.id} must use a human-confirmed mask`);
    else if (packet.maskFingerprint !== routeMaskFingerprint(mask)) errors.push(`Route packet ${packet.id} has a stale mask fingerprint`);
    if (!new Set(["same-space-advance", "adjacent-space"]).has(packet.transitionRelation)) errors.push(`Route packet ${packet.id} has an invalid transition relation`);
    if (!new Set(["ready", "blocked-source-geometry", "consumed"]).has(packet.generationStatus)) errors.push(`Route packet ${packet.id} has an invalid generation status`);
    if (packet.transitionRelation === "same-space-advance" && packet.sourceSpaceId !== packet.targetSpaceId) errors.push(`Route packet ${packet.id} must retain its space id`);
    if (packet.transitionRelation === "adjacent-space" && packet.sourceSpaceId === packet.targetSpaceId) errors.push(`Route packet ${packet.id} must enter a new space id`);
    if (packet.generationStatus === "consumed") {
      if (path?.status !== "active" || path.targetSceneId !== packet.targetSceneId || targetScene?.sourcePathId !== packet.sourcePathId) {
        errors.push(`Consumed route packet ${packet.id} must match its promoted target scene`);
      }
    } else {
      if (path?.status !== "pending") errors.push(`Route packet ${packet.id} must target a pending source path`);
      if (!packet.targetSceneId || targetScene) errors.push(`Route packet ${packet.id} must reserve a new target scene id`);
    }
    if (!packet.references?.cleanSource || !packet.references?.routeMap || !packet.references?.routeCrop) errors.push(`Route packet ${packet.id} is missing visual references`);
    if (!packet.cameraTransition?.instruction || !packet.cameraTransition?.distanceMeters || !packet.cameraTransition?.targetView) errors.push(`Route packet ${packet.id} is missing its camera contract`);
    if (!Array.isArray(packet.continuityAnchors) || packet.continuityAnchors.length < 3) errors.push(`Route packet ${packet.id} needs at least three continuity anchors`);
    if (!packet.prompt?.includes(packet.sourcePathId) || !packet.prompt?.includes("Route guard")) errors.push(`Route packet ${packet.id} is missing a route-conditioned prompt`);
  }
  return errors;
}
