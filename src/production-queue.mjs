import { indexScenes } from "./scene-model.mjs";

function annotationMap(annotations) {
  return new Map((annotations?.scenes ?? []).map((entry) => [entry.sceneId, entry]));
}

function compareFrontiers(first, second) {
  return second.depth - first.depth
    || first.current_scene_id.localeCompare(second.current_scene_id)
    || first.path_id.localeCompare(second.path_id);
}

export function classifyFrontiers(world, registry, annotations, { fourPlusApprovedSceneIds = [] } = {}) {
  const scenes = indexScenes(world);
  const humanRecords = annotationMap(annotations);
  const rareApprovals = new Set(fourPlusApprovedSceneIds);
  const ready = [];
  const blocked = [];

  for (const frontier of registry?.frontiers ?? []) {
    const scene = scenes.get(frontier.current_scene_id);
    const path = scene?.paths?.find((entry) => entry.id === frontier.path_id);
    const annotation = humanRecords.get(frontier.current_scene_id);
    let reason = null;

    if (!scene || !path) reason = "invalid-frontier";
    else if (!annotation) reason = "awaiting-human-annotation";
    else if (annotation.annotationStatus !== "masks-confirmed") reason = annotation.annotationStatus;
    else if (annotation.observedVisibleRouteCount >= 4 && !rareApprovals.has(scene.id)) reason = "requires-four-plus-approval";
    else if (!annotation.masks?.some((mask) => mask.sourcePathId === path.id)) reason = "needs-route-reconciliation";

    const entry = { ...frontier, reason };
    if (reason) blocked.push(entry);
    else ready.push(entry);
  }

  ready.sort(compareFrontiers);
  blocked.sort(compareFrontiers);
  return { ready, blocked };
}

export function deriveCandidateStatus(candidate, annotations) {
  const annotation = annotationMap(annotations).get(candidate.id);
  if (!annotation) return "awaiting-route-annotation";
  if (annotation.annotationStatus === "staging-masks-confirmed") return "ready-for-promotion";
  return "annotation-invalid";
}

export function validateProductionQueue(world, registry, annotations, queue) {
  const errors = [];
  if (queue?.worldVersion !== world.worldVersion) errors.push("Production queue world version must match the scene registry");
  if (!queue?.batch?.id) errors.push("Production queue is missing a batch id");
  if (queue?.batch?.strategy !== "depth-first-human-gated") errors.push("Production queue must use depth-first-human-gated strategy");
  if (!Number.isInteger(queue?.batch?.targetSceneCount) || queue.batch.targetSceneCount < 1 || queue.batch.targetSceneCount > 20) {
    errors.push("Production queue target scene count must be between 1 and 20");
  }
  if (!Array.isArray(queue?.completedSceneIds)) errors.push("Production queue must contain completedSceneIds");
  if (!Array.isArray(queue?.candidates) || queue.candidates.length > 1) {
    errors.push("A human-gated production queue may expose at most one candidate at a time");
    return errors;
  }

  const scenes = indexScenes(world);
  const frontiers = new Map((registry?.frontiers ?? []).map((entry) => [entry.path_id, entry]));
  const completed = new Set(queue.completedSceneIds ?? []);
  if (completed.size !== (queue.completedSceneIds ?? []).length) errors.push("Production queue completed scene ids must be unique");
  if (completed.size > (queue.batch?.targetSceneCount ?? 0)) errors.push("Production queue completed count exceeds its target");

  for (const candidate of queue.candidates ?? []) {
    if (!candidate.id || scenes.has(candidate.id) || completed.has(candidate.id)) errors.push(`Candidate id is missing or already registered: ${candidate.id ?? "unknown"}`);
    const source = scenes.get(candidate.sourceSceneId);
    const sourcePath = source?.paths?.find((path) => path.id === candidate.sourcePathId);
    const frontier = frontiers.get(candidate.sourcePathId);
    if (!source || !sourcePath || sourcePath.status !== "pending") errors.push(`Candidate ${candidate.id} must start from a pending source path`);
    if (!frontier || frontier.current_scene_id !== candidate.sourceSceneId) errors.push(`Candidate ${candidate.id} source is missing from the frontier registry`);
    if (candidate.branchId !== frontier?.branch_id) errors.push(`Candidate ${candidate.id} branch does not match its frontier`);
    if (!candidate.image || !candidate.asset || candidate.asset.width / candidate.asset.height !== 4 / 3) {
      errors.push(`Candidate ${candidate.id} must declare an exact 4:3 image asset`);
    }
    if (!candidate.generatorOutput || !candidate.promptRecord) errors.push(`Candidate ${candidate.id} is missing generation provenance`);
    const derivedStatus = deriveCandidateStatus(candidate, annotations);
    if (candidate.status !== derivedStatus) errors.push(`Candidate ${candidate.id} status should be ${derivedStatus}`);
  }

  return errors;
}
