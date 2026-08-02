function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function collapseDuplicatePendingPaths(inputWorld, inputAnnotations) {
  const world = clone(inputWorld);
  const annotations = clone(inputAnnotations);
  const removedPathIds = [];
  const annotationById = new Map((annotations.scenes ?? []).map((record) => [record.sceneId, record]));

  for (const scene of world.scenes) {
    const canonicalByRegion = new Map();
    const replacements = new Map();
    for (const path of scene.paths) {
      if (path.status !== "pending" || !path.regions) continue;
      const fingerprint = JSON.stringify(path.regions);
      const canonical = canonicalByRegion.get(fingerprint);
      if (canonical) {
        replacements.set(path.id, canonical.id);
        removedPathIds.push(path.id);
      } else {
        canonicalByRegion.set(fingerprint, path);
      }
    }
    if (!replacements.size) continue;
    scene.paths = scene.paths.filter((path) => !replacements.has(path.id));
    for (const mask of annotationById.get(scene.id)?.masks ?? []) {
      if (replacements.has(mask.sourcePathId)) mask.sourcePathId = replacements.get(mask.sourcePathId);
    }
  }

  return { world, annotations, removedPathIds };
}

export function restoreKnownMaskSources(inputPayload, world, previousAnnotations) {
  const payload = clone(inputPayload);
  const scenes = new Map(world.scenes.map((scene) => [scene.id, scene]));
  const previousByScene = new Map((previousAnnotations?.scenes ?? []).map((record) => [record.sceneId, record]));
  for (const record of payload.scenes ?? []) {
    const scene = scenes.get(record.sceneId);
    const previousMasks = new Map((previousByScene.get(record.sceneId)?.masks ?? []).map((mask) => [mask.id, mask]));
    if (!scene) continue;
    for (const mask of record.masks ?? []) {
      if (mask.sourcePathId) continue;
      const previous = previousMasks.get(mask.id);
      const path = previous?.sourcePathId && scene.paths.find((candidate) => candidate.id === previous.sourcePathId);
      if (!path) continue;
      mask.sourcePathId = path.id;
      mask.status = path.status;
    }
  }
  return payload;
}

function deriveAnnotationStatus(scene, masks, reviewComplete) {
  const sourceIds = new Set(masks.map((mask) => mask.sourcePathId).filter(Boolean));
  const hasNewRoutes = masks.some((mask) => !mask.sourcePathId);
  const hasRemovedRoutes = scene.paths.some((path) => !sourceIds.has(path.id));
  if (scene.staging) {
    if (reviewComplete) return "staging-masks-confirmed";
    return masks.length ? "staging-awaiting-approval" : "awaiting-route-annotation";
  }
  if (hasNewRoutes) return "needs-route-registration";
  if (hasRemovedRoutes) return "needs-route-reconciliation";
  return reviewComplete ? "masks-confirmed" : "awaiting-review-approval";
}

function normalizeMask(mask, scene, errors, ids) {
  if (!mask?.id || typeof mask.id !== "string" || ids.has(mask.id)) {
    errors.push(`Scene ${scene.id} contains a missing or duplicate mask id`);
    return null;
  }
  ids.add(mask.id);
  const sourcePathId = mask.sourcePathId || null;
  if (sourcePathId && !scene.paths.some((path) => path.id === sourcePathId)) {
    errors.push(`Scene ${scene.id} mask ${mask.id} references unknown source path ${sourcePathId}`);
  }
  const regions = {};
  for (const viewport of ["desktop", "mobile"]) {
    const points = mask.regions?.[viewport];
    if (!Array.isArray(points) || points.length < 3 || points.length > 64) {
      errors.push(`Scene ${scene.id} mask ${mask.id} has an invalid ${viewport} polygon`);
      regions[viewport] = [];
      continue;
    }
    regions[viewport] = points.map((point) => {
      if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) {
        errors.push(`Scene ${scene.id} mask ${mask.id} contains an invalid ${viewport} point`);
        return [0, 0];
      }
      const [x, y] = point;
      if (x < 0 || y < 0 || x > scene.asset.width || y > scene.asset.height) {
        errors.push(`Scene ${scene.id} mask ${mask.id} contains a ${viewport} point outside the image`);
      }
      return [Math.round(x), Math.round(y)];
    });
  }
  return { id: mask.id, sourcePathId, status: sourcePathId ? mask.status : "draft", regions };
}

export function normalizeAnnotationImport(payload, world, staging) {
  const errors = [];
  if (payload?.worldVersion !== world.worldVersion) errors.push("Annotation world version does not match the scene registry");
  if (!Array.isArray(payload?.scenes)) errors.push("Annotation payload must contain a scenes array");
  if (errors.length) return { errors, value: null, changedSceneIds: [] };

  const allScenes = [...world.scenes, ...(staging?.candidates ?? [])];
  const scenesById = new Map(allScenes.map((scene) => [scene.id, scene]));
  const recordsById = new Map();
  for (const record of payload.scenes) {
    if (!record?.sceneId || recordsById.has(record.sceneId)) errors.push(`Missing or duplicate annotation scene id: ${record?.sceneId ?? "unknown"}`);
    else recordsById.set(record.sceneId, record);
  }
  for (const sceneId of recordsById.keys()) {
    if (!scenesById.has(sceneId)) errors.push(`Annotation contains unknown scene ${sceneId}`);
  }
  for (const scene of allScenes) {
    if (!recordsById.has(scene.id)) errors.push(`Annotation export is missing scene ${scene.id}`);
  }

  const normalizedScenes = [];
  for (const scene of allScenes) {
    const record = recordsById.get(scene.id);
    if (!record) continue;
    if (record.image !== scene.image) errors.push(`Annotation image for ${scene.id} does not match the current scene asset`);
    if (!Array.isArray(record.masks) || record.masks.length > 32) {
      errors.push(`Scene ${scene.id} must contain between 0 and 32 masks`);
      continue;
    }
    if (!scene.staging && record.masks.length === 0) errors.push(`Registered scene ${scene.id} cannot remove every route`);
    const ids = new Set();
    const masks = record.masks.map((mask) => normalizeMask(mask, scene, errors, ids)).filter(Boolean);
    const reviewComplete = record.reviewComplete === true;
    normalizedScenes.push({
      sceneId: scene.id,
      image: scene.image,
      observedVisibleRouteCount: masks.length,
      annotationStatus: deriveAnnotationStatus(scene, masks, reviewComplete),
      reviewComplete,
      masks,
    });
  }

  normalizedScenes.sort((first, second) => first.sceneId.localeCompare(second.sceneId));
  return {
    errors,
    value: errors.length ? null : {
      worldVersion: world.worldVersion,
      updatedAt: payload.updatedAt ?? new Date().toISOString(),
      scenes: clone(normalizedScenes),
    },
  };
}
