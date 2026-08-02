export const ROUTE_AUDIT_SCHEMA_VERSION = 1;

export function routeMaskFingerprint(scene) {
  const serialized = JSON.stringify((scene?.paths ?? []).map((path) => ({
    id: path.id,
    status: path.status,
    desktop: path.regions?.desktop ?? null,
    mobile: path.regions?.mobile ?? null
  })));
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export const routeAuditOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    route_count: { type: "integer", minimum: 0, maximum: 12 },
    ambiguity: { type: "boolean" },
    ambiguity_reason: { type: "string" },
    scene_summary: { type: "string" },
    routes: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          route_id: { type: "string" },
          description: { type: "string" },
          evidence: { type: "string" },
          visibility: { type: "string", enum: ["clear", "partial", "implied"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          entry_region: {
            type: "object",
            additionalProperties: false,
            properties: {
              left: { type: "integer", minimum: 0, maximum: 1000 },
              top: { type: "integer", minimum: 0, maximum: 1000 },
              right: { type: "integer", minimum: 0, maximum: 1000 },
              bottom: { type: "integer", minimum: 0, maximum: 1000 }
            },
            required: ["left", "top", "right", "bottom"]
          }
        },
        required: ["route_id", "description", "evidence", "visibility", "confidence", "entry_region"]
      }
    }
  },
  required: ["route_count", "ambiguity", "ambiguity_reason", "scene_summary", "routes"]
};

export function normalizeAuditPass(raw, auditor) {
  const routes = Array.isArray(raw?.routes) ? raw.routes : [];
  const declaredCount = Number.isInteger(raw?.route_count) ? raw.route_count : routes.length;
  const countMismatch = declaredCount !== routes.length;
  const averageConfidence = routes.length
    ? routes.reduce((sum, route) => sum + Number(route.confidence ?? 0), 0) / routes.length
    : 0;
  return {
    auditor,
    routeCount: declaredCount,
    ambiguity: Boolean(raw?.ambiguity) || countMismatch,
    ambiguityReason: countMismatch
      ? `Declared ${declaredCount} routes but returned ${routes.length} route records.`
      : String(raw?.ambiguity_reason ?? ""),
    sceneSummary: String(raw?.scene_summary ?? ""),
    averageConfidence,
    routes
  };
}

export function reconcileAuditPasses(passes, {
  registeredRouteCount,
  desiredRouteCount = null,
  expectedRouteCount = null,
  rareRouteApproved = false,
  humanTopologyApproved = false,
  lowConfidenceThreshold = 0.6,
  adjudicationPass = null
}) {
  const routeCounts = passes.map((pass) => pass.routeCount);
  const auditorsAgree = routeCounts.length >= 2 && new Set(routeCounts).size === 1;
  const adjudicated = Boolean(adjudicationPass);
  const decisionPasses = adjudicated ? [adjudicationPass] : passes;
  const consensusRouteCount = adjudicated
    ? adjudicationPass.routeCount
    : auditorsAgree
      ? routeCounts[0]
      : null;
  const blockingReasons = [];

  if (!auditorsAgree && !adjudicated) blockingReasons.push("auditors-disagree");
  if (decisionPasses.some((pass) => pass.ambiguity)) blockingReasons.push("auditor-reported-ambiguity");
  if (decisionPasses.some((pass) => pass.averageConfidence < lowConfidenceThreshold)) blockingReasons.push("low-confidence-audit");
  if (consensusRouteCount !== null && consensusRouteCount !== registeredRouteCount) {
    blockingReasons.push("registered-route-count-mismatch");
  }
  if (consensusRouteCount !== null && desiredRouteCount !== null && consensusRouteCount !== desiredRouteCount) {
    blockingReasons.push("generated-route-target-mismatch");
  }
  if (consensusRouteCount !== null && expectedRouteCount !== null && consensusRouteCount !== expectedRouteCount) {
    blockingReasons.push("regression-count-mismatch");
  }
  if (consensusRouteCount !== null && consensusRouteCount >= 4 && !rareRouteApproved) {
    blockingReasons.push("four-plus-route-review");
  }
  if (humanTopologyApproved && expectedRouteCount !== null && registeredRouteCount === expectedRouteCount) {
    const supersededByHumanTopology = new Set([
      "auditors-disagree",
      "auditor-reported-ambiguity",
      "low-confidence-audit",
      "registered-route-count-mismatch",
      "regression-count-mismatch"
    ]);
    if (expectedRouteCount < 4) supersededByHumanTopology.add("four-plus-route-review");
    for (let index = blockingReasons.length - 1; index >= 0; index -= 1) {
      if (supersededByHumanTopology.has(blockingReasons[index])) blockingReasons.splice(index, 1);
    }
  }

  return {
    status: blockingReasons.length ? "blocked" : "pass",
    auditorsAgree,
    adjudicated,
    preliminaryRouteCounts: routeCounts,
    consensusRouteCount,
    registeredRouteCount,
    desiredRouteCount,
    expectedRouteCount,
    rareRouteApproved,
    humanTopologyApproved,
    blockingReasons
  };
}

export function validateRouteAuditRegistry(world, registry, {
  requirePass = false,
  requiredSceneIds = [],
  expectedRouteCounts = {}
} = {}) {
  const errors = [];
  if (!registry || registry.schemaVersion !== ROUTE_AUDIT_SCHEMA_VERSION) {
    errors.push("Route-audit registry has an unsupported schema version");
  }
  if (registry?.worldVersion !== world.worldVersion) {
    errors.push("Route-audit world version must match the scene registry");
  }
  if (!Array.isArray(registry?.audits)) {
    return [...errors, "Route-audit registry must contain audits"];
  }

  const scenes = new Map(world.scenes.map((scene) => [scene.id, scene]));
  const audited = new Set();
  for (const audit of registry.audits) {
    if (!audit.sceneId || audited.has(audit.sceneId)) {
      errors.push(`Duplicate or missing route audit: ${audit.sceneId ?? "unknown"}`);
      continue;
    }
    audited.add(audit.sceneId);
    const scene = scenes.get(audit.sceneId);
    if (!scene) {
      errors.push(`Route audit targets missing scene ${audit.sceneId}`);
      continue;
    }
    if (audit.image !== scene.image) errors.push(`Route audit ${audit.sceneId} image is stale`);
    if (audit.pathFingerprint !== routeMaskFingerprint(scene)) {
      errors.push(`Route audit ${audit.sceneId} path masks are stale`);
    }
    if (!Array.isArray(audit.passes) || audit.passes.length !== 2) {
      errors.push(`Route audit ${audit.sceneId} must contain exactly two independent passes`);
    }
    if (audit.comparison?.adjudicated && !audit.adjudication) {
      errors.push(`Route audit ${audit.sceneId} is missing its adjudication pass`);
    }
    if (audit.comparison?.registeredRouteCount !== scene.paths.length) {
      errors.push(`Route audit ${audit.sceneId} registered route count is stale`);
    }
    const expectedRouteCount = expectedRouteCounts instanceof Map
      ? expectedRouteCounts.get(audit.sceneId)
      : expectedRouteCounts[audit.sceneId];
    if (Number.isInteger(expectedRouteCount) && audit.comparison?.expectedRouteCount !== expectedRouteCount) {
      errors.push(`Route audit ${audit.sceneId} expected route count is stale`);
    }
    if (!Array.isArray(audit.comparison?.blockingReasons)) {
      errors.push(`Route audit ${audit.sceneId} is missing blocking reasons`);
    }
    if (requirePass && audit.comparison?.status !== "pass") {
      errors.push(`Route audit ${audit.sceneId} blocks release: ${(audit.comparison?.blockingReasons ?? []).join(", ")}`);
    }
  }
  for (const sceneId of new Set(requiredSceneIds)) {
    if (!audited.has(sceneId)) errors.push(`Required scene ${sceneId} has no route audit`);
  }
  return errors;
}
