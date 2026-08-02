export const SAVE_KEY = "backrooms.progress";

export function indexScenes(world) {
  return new Map(world.scenes.map((scene) => [scene.id, scene]));
}

export function validateWorld(world) {
  const errors = [];
  const sceneIds = new Set();
  const pathIds = new Set();
  const incoming = new Map();
  const allowedMovementTypes = new Set(["DIRECT", "COMPRESSED", "THRESHOLD"]);

  if (!world?.worldVersion) errors.push("Missing worldVersion");
  if (!world?.startSceneId) errors.push("Missing startSceneId");
  if (!world?.contentBoundary?.symbolImage || !world?.contentBoundary?.epilogueImage) {
    errors.push("World must register content-boundary symbol and epilogue images");
  }
  if (!world?.contentBoundary?.asset || world.contentBoundary.asset.width / world.contentBoundary.asset.height !== 4 / 3) {
    errors.push("Content-boundary assets must declare an exact 4:3 size");
  }
  for (const regionName of ["desktop", "mobile"]) {
    const points = world?.contentBoundary?.symbolRegions?.[regionName];
    if (!Array.isArray(points) || points.length < 3) {
      errors.push(`Content-boundary symbol has an invalid ${regionName} region`);
      continue;
    }
    for (const [x, y] of points) {
      if (x < 0 || y < 0 || x > world.contentBoundary.asset.width || y > world.contentBoundary.asset.height) {
        errors.push(`Content-boundary symbol ${regionName} point is outside the image`);
      }
    }
  }
  if (!Array.isArray(world?.scenes) || world.scenes.length === 0) {
    return [...errors, "World must register at least one scene"];
  }

  for (const scene of world.scenes) {
    if (!scene.id) errors.push("Scene is missing an id");
    if (sceneIds.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}`);
    sceneIds.add(scene.id);
    incoming.set(scene.id, []);
    for (const field of ["levelId", "branchId", "status", "approvalStatus", "reviewStatus", "accessibleName", "description"]) {
      if (!scene[field]) errors.push(`Scene ${scene.id} is missing ${field}`);
    }
    if (scene.id !== world.startSceneId && (!scene.sourceSceneId || !scene.sourcePathId)) {
      errors.push(`Scene ${scene.id} must declare its source scene and path`);
    }
    if (!Array.isArray(scene.continuityAnchors) || scene.continuityAnchors.length === 0) {
      errors.push(`Scene ${scene.id} must declare continuity anchors`);
    }
    if (!Array.isArray(scene.recentChanges)) {
      errors.push(`Scene ${scene.id} must declare recent changes`);
    }
    if (!scene.image) errors.push(`Scene ${scene.id} is missing an image`);
    if (!scene.asset || scene.asset.width / scene.asset.height !== 4 / 3) {
      errors.push(`Scene ${scene.id} must declare an exact 4:3 asset`);
    }
    if (!Array.isArray(scene.paths) || scene.paths.length === 0) {
      errors.push(`Scene ${scene.id} must register at least one path`);
    }

    const pendingPaths = (scene.paths ?? []).filter((path) => path.status === "pending");
    const activePaths = (scene.paths ?? []).filter((path) => path.status === "active");
    if (scene.status === "provisional-frontier" && pendingPaths.length === 0) {
      errors.push(`Frontier scene ${scene.id} must register at least one pending path`);
    }
    if (scene.status === "provisional-frontier" && activePaths.length > 0) {
      errors.push(`Frontier scene ${scene.id} cannot register an active path`);
    }

    for (const path of scene.paths ?? []) {
      if (!path.id) errors.push(`Scene ${scene.id} has a path without an id`);
      if (pathIds.has(path.id)) errors.push(`Duplicate path id: ${path.id}`);
      pathIds.add(path.id);
      for (const field of ["accessibleName", "semanticDescription", "screenLocation", "physicalForm", "movementDirection", "movementType"]) {
        if (!path[field]) errors.push(`Path ${path.id} is missing ${field}`);
      }
      if (!allowedMovementTypes.has(path.movementType)) {
        errors.push(`Path ${path.id} has unsupported movement type ${path.movementType}`);
      }
      if (!Array.isArray(path.continuityAnchors) || path.continuityAnchors.length === 0) {
        errors.push(`Path ${path.id} must declare continuity anchors`);
      }
      if (path.status === "active" && !path.targetSceneId) {
        errors.push(`Active path ${path.id} has no target`);
      }
      if (path.status === "active" && path.frontier) {
        errors.push(`Active path ${path.id} cannot be marked as a frontier`);
      }
      if (path.status === "pending" && (!path.frontier || path.targetSceneId)) {
        errors.push(`Pending path ${path.id} must be a frontier without a target`);
      }
      if (path.status === "pending" && !path.frontierBranchId) {
        errors.push(`Pending path ${path.id} must declare its frontier branch`);
      }
      if (!new Set(["active", "pending"]).has(path.status)) {
        errors.push(`Path ${path.id} has unsupported status ${path.status}`);
      }
      for (const regionName of ["desktop", "mobile"]) {
        const points = path.regions?.[regionName];
        if (!Array.isArray(points) || points.length < 3) {
          errors.push(`Path ${path.id} has an invalid ${regionName} region`);
          continue;
        }
        for (const [x, y] of points) {
          if (x < 0 || y < 0 || x > scene.asset.width || y > scene.asset.height) {
            errors.push(`Path ${path.id} ${regionName} point is outside the image`);
          }
        }
        if (regionName === "mobile") {
          const xs = points.map(([x]) => x);
          const ys = points.map(([, y]) => y);
          const narrowViewportScale = 320 / scene.asset.width;
          if ((Math.max(...xs) - Math.min(...xs)) * narrowViewportScale < 44 || (Math.max(...ys) - Math.min(...ys)) * narrowViewportScale < 44) {
            errors.push(`Path ${path.id} mobile region is smaller than 44 CSS pixels at 320px viewport width`);
          }
        }
      }
    }
  }

  if (!sceneIds.has(world.startSceneId)) {
    errors.push(`Start scene does not exist: ${world.startSceneId}`);
  }

  for (const scene of world.scenes) {
    for (const path of scene.paths ?? []) {
      if (path.status === "active" && !sceneIds.has(path.targetSceneId)) {
        errors.push(`Path ${path.id} targets missing scene ${path.targetSceneId}`);
      }
      if (path.status === "active" && sceneIds.has(path.targetSceneId)) {
        incoming.get(path.targetSceneId).push({ sceneId: scene.id, pathId: path.id });
      }
    }
  }

  for (const [sceneId, sources] of incoming) {
    if (sceneId === world.startSceneId && sources.length > 0) {
      errors.push(`Start scene ${sceneId} cannot have an incoming path`);
    }
    if (sources.length > 1) {
      errors.push(`Branch merge detected at ${sceneId}`);
    }
    if (sceneId !== world.startSceneId && sources.length === 1) {
      const scene = world.scenes.find((candidate) => candidate.id === sceneId);
      if (scene.sourceSceneId !== sources[0].sceneId || scene.sourcePathId !== sources[0].pathId) {
        errors.push(`Scene ${sceneId} source metadata does not match its incoming path`);
      }
    }
  }

  const adjacency = new Map(
    world.scenes.map((scene) => [
      scene.id,
      (scene.paths ?? []).filter((path) => path.status === "active").map((path) => path.targetSceneId),
    ]),
  );
  const visiting = new Set();
  const visited = new Set();
  function visit(sceneId) {
    if (visiting.has(sceneId)) {
      errors.push(`Reverse movement or cycle detected at ${sceneId}`);
      return;
    }
    if (visited.has(sceneId)) return;
    visiting.add(sceneId);
    for (const target of adjacency.get(sceneId) ?? []) visit(target);
    visiting.delete(sceneId);
    visited.add(sceneId);
  }
  visit(world.startSceneId);

  for (const sceneId of sceneIds) {
    if (!visited.has(sceneId)) errors.push(`Unreachable scene: ${sceneId}`);
  }

  return errors;
}

export function validateFrontiers(world, registry) {
  const errors = [];
  if (!registry || registry.world_version !== world.worldVersion) {
    errors.push("Frontier registry world version must match the scene registry");
  }
  if (!Array.isArray(registry?.frontiers)) {
    return [...errors, "Frontier registry must contain a frontiers array"];
  }

  const scenes = indexScenes(world);
  const pending = new Map();
  const depths = new Map([[world.startSceneId, 0]]);
  const queue = [world.startSceneId];
  while (queue.length) {
    const sceneId = queue.shift();
    const scene = scenes.get(sceneId);
    for (const path of scene?.paths ?? []) {
      if (path.status === "pending") pending.set(path.id, { scene, path });
      if (path.status === "active" && !depths.has(path.targetSceneId)) {
        depths.set(path.targetSceneId, depths.get(sceneId) + 1);
        queue.push(path.targetSceneId);
      }
    }
  }

  const registeredPaths = new Set();
  const registeredBranches = new Set();
  for (const frontier of registry.frontiers) {
    if (!frontier.branch_id || registeredBranches.has(frontier.branch_id)) {
      errors.push(`Duplicate or missing frontier branch: ${frontier.branch_id ?? "unknown"}`);
    }
    registeredBranches.add(frontier.branch_id);
    if (!frontier.path_id || registeredPaths.has(frontier.path_id)) {
      errors.push(`Duplicate or missing frontier path: ${frontier.path_id ?? "unknown"}`);
    }
    registeredPaths.add(frontier.path_id);

    const match = pending.get(frontier.path_id);
    if (!match || match.scene.id !== frontier.current_scene_id) {
      errors.push(`Frontier ${frontier.path_id} does not match a pending scene path`);
      continue;
    }
    if (frontier.branch_id !== match.path.frontierBranchId) errors.push(`Frontier ${frontier.path_id} has the wrong branch`);
    if (frontier.branch_id !== match.scene.branchId && frontier.parent_branch_id !== match.scene.branchId) {
      errors.push(`Frontier ${frontier.path_id} must identify its parent branch`);
    }
    if (frontier.level_id !== match.scene.levelId) errors.push(`Frontier ${frontier.path_id} has the wrong level`);
    if (frontier.status !== "pending") errors.push(`Frontier ${frontier.path_id} must remain pending`);
    if (frontier.depth !== depths.get(match.scene.id)) errors.push(`Frontier ${frontier.path_id} has the wrong graph depth`);
    if (!frontier.approval_status) errors.push(`Frontier ${frontier.path_id} is missing approval status`);
    if (!frontier.current_state || typeof frontier.current_state !== "object") errors.push(`Frontier ${frontier.path_id} is missing current state`);
    if (!Array.isArray(frontier.recent_drift)) errors.push(`Frontier ${frontier.path_id} is missing recent drift`);
    if (!Array.isArray(frontier.continuity_anchors) || frontier.continuity_anchors.length === 0) {
      errors.push(`Frontier ${frontier.path_id} is missing continuity anchors`);
    }
  }

  for (const pathId of pending.keys()) {
    if (!registeredPaths.has(pathId)) errors.push(`Pending path ${pathId} is missing from the frontier registry`);
  }
  return errors;
}

export function validateGenerationBatch(world, batch) {
  const errors = [];
  if (!batch || batch.worldVersion !== world.worldVersion) {
    errors.push("Generation batch world version must match the scene registry");
  }
  if (!Array.isArray(batch?.jobs) || batch.jobs.length === 0) {
    return [...errors, "Generation batch must contain jobs"];
  }

  const scenes = indexScenes(world);
  const jobIds = new Set();
  const sceneIds = new Set();
  const routeCounts = new Map();
  for (const job of batch.jobs) {
    if (!job.id || jobIds.has(job.id)) errors.push(`Duplicate or missing generation job: ${job.id ?? "unknown"}`);
    jobIds.add(job.id);
    if (!job.sceneId || sceneIds.has(job.sceneId)) errors.push(`Duplicate or missing generated scene: ${job.sceneId ?? "unknown"}`);
    sceneIds.add(job.sceneId);
    const scene = scenes.get(job.sceneId);
    if (!scene) {
      errors.push(`Generation job ${job.id} targets missing scene ${job.sceneId}`);
      continue;
    }
    if (scene.sourceSceneId !== job.sourceSceneId || scene.sourcePathId !== job.sourcePathId) {
      errors.push(`Generation job ${job.id} source metadata does not match ${job.sceneId}`);
    }
    const sourcePath = scenes.get(job.sourceSceneId)?.paths?.find((path) => path.id === job.sourcePathId);
    if (sourcePath?.targetSceneId !== job.sceneId) {
      errors.push(`Generation job ${job.id} is not connected from its source path`);
    }
    if (job.status !== "registered") errors.push(`Generation job ${job.id} is not registered`);
    if (job.observedVisibleRouteCount !== scene.paths.length) {
      errors.push(`Generation job ${job.id} route count does not match its registered masks`);
    }
    if (job.finalImage !== scene.image) errors.push(`Generation job ${job.id} final image does not match its scene`);
    if (!job.promptRecord || !job.generatorOutput) errors.push(`Generation job ${job.id} is missing generation provenance`);
    routeCounts.set(job.observedVisibleRouteCount, (routeCounts.get(job.observedVisibleRouteCount) ?? 0) + 1);
  }

  if (batch.policy?.targetSceneCount !== batch.jobs.length) {
    errors.push("Generation batch target scene count does not match its jobs");
  }
  const expected = batch.policy?.expectedRouteDistribution ?? {};
  for (const [bucket, count] of Object.entries(expected)) {
    const observed = bucket === "4+"
      ? [...routeCounts].filter(([routeCount]) => routeCount >= 4).reduce((sum, [, value]) => sum + value, 0)
      : routeCounts.get(Number(bucket)) ?? 0;
    if (observed !== count) errors.push(`Generation batch route bucket ${bucket} expected ${count}, got ${observed}`);
  }
  return errors;
}

export function validateRouteReviews(world, registry, { requirePlaytestPass = false } = {}) {
  const errors = [];
  if (!registry || registry.worldVersion !== world.worldVersion) {
    errors.push("Route-review world version must match the scene registry");
  }
  if (!Array.isArray(registry?.scenes)) {
    return [...errors, "Route-review registry must contain scenes"];
  }

  const scenes = indexScenes(world);
  const registered = new Set();
  for (const review of registry.scenes) {
    if (!review.sceneId || registered.has(review.sceneId)) {
      errors.push(`Duplicate or missing route-review scene: ${review.sceneId ?? "unknown"}`);
      continue;
    }
    registered.add(review.sceneId);
    const scene = scenes.get(review.sceneId);
    if (!scene) {
      errors.push(`Route review targets missing scene ${review.sceneId}`);
      continue;
    }
    const pathIds = scene.paths.map((path) => path.id).sort();
    const registeredPathIds = [...(review.registeredPathIds ?? [])].sort();
    if (JSON.stringify(pathIds) !== JSON.stringify(registeredPathIds)) {
      errors.push(`Route review ${review.sceneId} does not cover every registered path`);
    }
    if (review.observedVisibleRouteCount !== scene.paths.length) {
      errors.push(`Route review ${review.sceneId} route count does not match the scene`);
    }
    if (!review.imageInspectionStatus || !review.maskInspectionStatus || !review.playtestStatus) {
      errors.push(`Route review ${review.sceneId} is missing a review status`);
    }
    if (requirePlaytestPass && review.playtestStatus !== "pass") {
      errors.push(`Route review ${review.sceneId} still needs user playtest approval`);
    }
  }

  for (const scene of world.scenes.filter((candidate) => candidate.reviewStatus === "needs-route-playtest")) {
    if (!registered.has(scene.id)) errors.push(`Scene ${scene.id} is missing from the route-review registry`);
  }
  return errors;
}

export function makeSavePayload(sceneId, worldVersion, extra = {}) {
  return { scene_id: sceneId, world_version: worldVersion, ...extra };
}

export function restoreSceneId(rawSave, world, directSceneId = null) {
  const scenes = indexScenes(world);
  if (directSceneId && scenes.has(directSceneId)) return directSceneId;
  if (!rawSave) return world.startSceneId;
  try {
    const save = JSON.parse(rawSave);
    if (save.world_version !== world.worldVersion) return world.startSceneId;
    if (!scenes.has(save.scene_id)) return world.startSceneId;
    return save.scene_id;
  } catch {
    return world.startSceneId;
  }
}

export function restoreBoundaryPathId(rawSave, world, sceneId) {
  if (!rawSave) return null;
  try {
    const save = JSON.parse(rawSave);
    if (save.world_version !== world.worldVersion || save.scene_id !== sceneId || save.boundary_state !== "symbol") return null;
    const scene = indexScenes(world).get(sceneId);
    const path = scene?.paths?.find((candidate) => candidate.id === save.pending_path_id);
    return path?.status === "pending" && path.frontier === true ? path.id : null;
  } catch {
    return null;
  }
}

export function reachableImages(scene, sceneIndex) {
  return (scene.paths ?? [])
    .filter((path) => path.status === "active")
    .map((path) => sceneIndex.get(path.targetSceneId)?.image)
    .filter(Boolean);
}
