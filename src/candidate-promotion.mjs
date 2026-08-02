function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function acceptedAccessibleName(value) {
  const cleaned = value.replace(/\bunreviewed\s+/i, "").replace(/\s+candidate$/i, "");
  return /^an [^aeiou]/i.test(cleaned) ? cleaned.replace(/^an /i, "a ") : cleaned;
}

function expandAxis(points, axis, minimumSpan, limit) {
  const values = points.map((point) => point[axis]);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = maximum - minimum;
  if (span >= minimumSpan) return points;
  const target = Math.min(minimumSpan, limit);
  const center = (minimum + maximum) / 2;
  const targetMinimum = Math.max(0, Math.min(limit - target, center - target / 2));
  return points.map((point) => {
    const next = [...point];
    const ratio = span ? (point[axis] - minimum) / span : 0.5;
    next[axis] = Math.round(targetMinimum + ratio * target);
    return next;
  });
}

function accessibleRegions(regions, asset) {
  const value = clone(regions);
  const minimumSpan = Math.ceil(asset.width * 44 / 320);
  value.mobile = expandAxis(value.mobile, 0, minimumSpan, asset.width);
  value.mobile = expandAxis(value.mobile, 1, minimumSpan, asset.height);
  return value;
}

function nextPathId(scene) {
  const prefix = `${scene.id}-P`;
  const used = new Set(scene.paths.map((path) => path.id));
  let index = scene.paths.reduce((highest, path) => {
    if (!path.id.startsWith(prefix)) return highest;
    const suffix = Number(path.id.slice(prefix.length));
    return Number.isInteger(suffix) ? Math.max(highest, suffix) : highest;
  }, 0) + 1;
  while (used.has(`${prefix}${index}`)) index += 1;
  return `${prefix}${index}`;
}

function describeMask(mask, scene) {
  const points = mask.regions.desktop;
  const centerX = points.reduce((sum, [x]) => sum + x, 0) / points.length;
  const ratio = centerX / scene.asset.width;
  if (ratio < 0.36) return { location: "left side, medium depth", direction: "forward then left" };
  if (ratio > 0.64) return { location: "right side, medium depth", direction: "forward then right" };
  return { location: "center, medium depth", direction: "forward" };
}

function makePendingPath(scene, mask, pathId, branchId) {
  const position = describeMask(mask, scene);
  return {
    id: pathId,
    status: "pending",
    frontier: true,
    frontierBranchId: branchId,
    accessibleName: `Continue through the visible passage in ${scene.id}`,
    semanticDescription: "A human-confirmed visible continuation in the Level 0 architecture",
    screenLocation: position.location,
    physicalForm: "wall-bounded carpeted passage",
    movementDirection: position.direction,
    movementType: "DIRECT",
    targetSceneId: null,
    targetCamera: null,
    continuityAnchors: scene.continuityAnchors.slice(0, 4),
    regions: accessibleRegions(mask.regions, scene.asset),
  };
}

function graphDepths(world) {
  const scenes = new Map(world.scenes.map((scene) => [scene.id, scene]));
  const depths = new Map([[world.startSceneId, 0]]);
  const queue = [world.startSceneId];
  while (queue.length) {
    const sceneId = queue.shift();
    for (const path of scenes.get(sceneId)?.paths ?? []) {
      if (path.status === "active" && !depths.has(path.targetSceneId)) {
        depths.set(path.targetSceneId, depths.get(sceneId) + 1);
        queue.push(path.targetSceneId);
      }
    }
  }
  return depths;
}

function rebuildFrontiers(world, previousRegistry) {
  const previous = new Map((previousRegistry?.frontiers ?? []).map((frontier) => [frontier.path_id, frontier]));
  const depths = graphDepths(world);
  const frontiers = [];
  for (const scene of world.scenes) {
    for (const path of scene.paths) {
      if (path.status !== "pending") continue;
      const old = previous.get(path.id);
      const frontier = {
        branch_id: path.frontierBranchId,
        current_scene_id: scene.id,
        path_id: path.id,
        level_id: scene.levelId,
        depth: depths.get(scene.id),
        status: "pending",
        approval_status: old?.approval_status ?? scene.approvalStatus,
        current_state: clone(scene.state),
        recent_drift: old?.recent_drift ?? [scene.recentChanges.at(-1) ?? "Human-confirmed route registered."],
        continuity_anchors: clone(path.continuityAnchors),
      };
      if (path.frontierBranchId !== scene.branchId) frontier.parent_branch_id = scene.branchId;
      frontiers.push(frontier);
    }
  }
  frontiers.sort((first, second) => second.depth - first.depth || first.path_id.localeCompare(second.path_id));
  return { world_version: world.worldVersion, frontiers };
}

function refreshAnnotationStatuses(world, annotations) {
  const scenes = new Map(world.scenes.map((scene) => [scene.id, scene]));
  for (const record of annotations.scenes) {
    const scene = scenes.get(record.sceneId);
    if (!scene) continue;
    const paths = new Map(scene.paths.map((path) => [path.id, path]));
    for (const mask of record.masks) {
      const path = paths.get(mask.sourcePathId);
      if (path) {
        mask.status = path.status;
        mask.regions = clone(path.regions);
      }
    }
    const sourceIds = new Set(record.masks.map((mask) => mask.sourcePathId).filter(Boolean));
    const hasUnregistered = record.masks.some((mask) => !mask.sourcePathId);
    const hasMissing = scene.paths.some((path) => !sourceIds.has(path.id));
    record.observedVisibleRouteCount = record.masks.length;
    record.annotationStatus = hasUnregistered
      ? "needs-route-registration"
      : hasMissing
        ? "needs-route-reconciliation"
        : record.reviewComplete
          ? "masks-confirmed"
          : "awaiting-review-approval";
  }
}

function syncRouteReviews(world, annotations, routeReviews, promotedSceneIds) {
  const annotationById = new Map(annotations.scenes.map((record) => [record.sceneId, record]));
  const reviewById = new Map(routeReviews.scenes.map((review) => [review.sceneId, review]));
  for (const scene of world.scenes) {
    const annotation = annotationById.get(scene.id);
    const review = reviewById.get(scene.id);
    if (review) {
      review.registeredPathIds = scene.paths.map((path) => path.id);
      review.observedVisibleRouteCount = scene.paths.length;
      if (annotation?.reviewComplete) review.maskInspectionStatus = "human-pass";
    }
    if (promotedSceneIds.includes(scene.id) && !review) {
      const created = {
        sceneId: scene.id,
        observedVisibleRouteCount: scene.paths.length,
        registeredPathIds: scene.paths.map((path) => path.id),
        imageInspectionStatus: "human-pass",
        maskInspectionStatus: "human-pass",
        playtestStatus: "pass",
        notes: ["Promoted from a human-completed route annotation."],
      };
      routeReviews.scenes.push(created);
      reviewById.set(scene.id, created);
    }
  }
  routeReviews.scenes.sort((first, second) => first.sceneId.localeCompare(second.sceneId));
}

export function promoteReviewedCandidates({
  world: inputWorld,
  registry: inputRegistry,
  annotations: inputAnnotations,
  queue: inputQueue,
  routeReviews: inputRouteReviews,
  now = new Date().toISOString(),
}) {
  const world = clone(inputWorld);
  const annotations = clone(inputAnnotations);
  const queue = clone(inputQueue);
  const routeReviews = clone(inputRouteReviews);
  const scenes = new Map(world.scenes.map((scene) => [scene.id, scene]));
  const annotationById = new Map(annotations.scenes.map((record) => [record.sceneId, record]));
  const registeredRouteIds = [];

  // The exported editor snapshot is authoritative for every registered scene,
  // not only the scene that happened to be in the review queue.
  for (const scene of world.scenes) {
    const record = annotationById.get(scene.id);
    if (!record) continue;
    const paths = new Map(scene.paths.map((path) => [path.id, path]));
    for (const mask of record.masks) {
      if (mask.sourcePathId && paths.has(mask.sourcePathId)) {
        paths.get(mask.sourcePathId).regions = accessibleRegions(mask.regions, scene.asset);
        continue;
      }
      if (mask.sourcePathId) continue;
      const pathId = nextPathId(scene);
      const branchId = `BR-${pathId}`;
      const path = makePendingPath(scene, mask, pathId, branchId);
      scene.paths.push(path);
      paths.set(pathId, path);
      mask.sourcePathId = pathId;
      mask.status = "pending";
      registeredRouteIds.push(pathId);
    }
  }

  const approvedFourPlus = new Set(queue.batch?.fourPlusApprovedSceneIds ?? []);
  const ready = queue.candidates.filter((candidate) => {
    const record = annotationById.get(candidate.id);
    return record?.reviewComplete && record.annotationStatus === "staging-masks-confirmed";
  });
  const promotedSceneIds = [];
  for (const candidate of ready) {
    const record = annotationById.get(candidate.id);
    if (!record.masks.length) throw new Error(`Candidate ${candidate.id} cannot be promoted without a route mask`);
    if (record.masks.length >= 4 && !approvedFourPlus.has(candidate.id)) {
      throw new Error(`Candidate ${candidate.id} requires explicit four-plus-route approval`);
    }
    const source = scenes.get(candidate.sourceSceneId);
    const sourcePath = source?.paths.find((path) => path.id === candidate.sourcePathId);
    if (!source || !sourcePath || sourcePath.status !== "pending") {
      throw new Error(`Candidate ${candidate.id} no longer starts from a pending source path`);
    }

    const scene = clone(candidate);
    delete scene.staging;
    delete scene.observedVisibleRouteCount;
    scene.status = "provisional-frontier";
    scene.approvalStatus = "human-route-confirmed";
    scene.reviewStatus = "route-playtest-passed";
    scene.accessibleName = acceptedAccessibleName(scene.accessibleName);
    scene.recentChanges = [...scene.recentChanges, `Promoted from human review with ${record.masks.length} visible route${record.masks.length === 1 ? "" : "s"}.`];
    scene.paths = record.masks.map((mask, index) => {
      const pathId = `${scene.id}-P${index + 1}`;
      const branchId = index === 0 ? scene.branchId : `BR-${pathId}`;
      mask.sourcePathId = pathId;
      mask.status = "pending";
      registeredRouteIds.push(pathId);
      return makePendingPath(scene, mask, pathId, branchId);
    });

    sourcePath.status = "active";
    sourcePath.targetSceneId = scene.id;
    sourcePath.targetCamera = `inside ${scene.id}, continuing from ${sourcePath.id}`;
    delete sourcePath.frontier;
    delete sourcePath.frontierBranchId;
    if (source.status === "provisional-frontier") source.status = "provisional";
    world.scenes.push(scene);
    scenes.set(scene.id, scene);
    record.annotationStatus = "masks-confirmed";
    promotedSceneIds.push(scene.id);
  }

  const promoted = new Set(promotedSceneIds);
  queue.candidates = queue.candidates.filter((candidate) => !promoted.has(candidate.id));
  queue.completedSceneIds = [...new Set([...(queue.completedSceneIds ?? []), ...promotedSceneIds])];
  queue.updatedAt = now;
  annotations.updatedAt = now;
  refreshAnnotationStatuses(world, annotations);
  syncRouteReviews(world, annotations, routeReviews, promotedSceneIds);
  const registry = rebuildFrontiers(world, inputRegistry);

  return { world, registry, annotations, queue, routeReviews, promotedSceneIds, registeredRouteIds };
}
