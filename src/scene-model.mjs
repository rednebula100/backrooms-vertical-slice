export const SAVE_KEY = "backrooms.progress";

export function indexScenes(world) {
  return new Map(world.scenes.map((scene) => [scene.id, scene]));
}

export function validateWorld(world) {
  const errors = [];
  const sceneIds = new Set();
  const pathIds = new Set();

  if (!world?.worldVersion) errors.push("Missing worldVersion");
  if (!world?.startSceneId) errors.push("Missing startSceneId");
  if (!Array.isArray(world?.scenes) || world.scenes.length === 0) {
    return [...errors, "World must register at least one scene"];
  }

  for (const scene of world.scenes) {
    if (!scene.id) errors.push("Scene is missing an id");
    if (sceneIds.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}`);
    sceneIds.add(scene.id);
    if (!scene.image) errors.push(`Scene ${scene.id} is missing an image`);
    if (!scene.asset || scene.asset.width / scene.asset.height !== 4 / 3) {
      errors.push(`Scene ${scene.id} must declare an exact 4:3 asset`);
    }

    for (const path of scene.paths ?? []) {
      if (!path.id) errors.push(`Scene ${scene.id} has a path without an id`);
      if (pathIds.has(path.id)) errors.push(`Duplicate path id: ${path.id}`);
      pathIds.add(path.id);
      if (path.status === "active" && !path.targetSceneId) {
        errors.push(`Active path ${path.id} has no target`);
      }
      if (path.status === "pending" && (!path.frontier || path.targetSceneId)) {
        errors.push(`Pending path ${path.id} must be a frontier without a target`);
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

export function reachableImages(scene, sceneIndex) {
  return (scene.paths ?? [])
    .filter((path) => path.status === "active")
    .map((path) => sceneIndex.get(path.targetSceneId)?.image)
    .filter(Boolean);
}

