const LEVEL_STATUSES = new Set(["in-production", "skeleton", "concept"]);
const REGION_STATUSES = new Set(["observed", "planned", "concept"]);
const CONNECTION_STATUSES = new Set(["reserved", "concept"]);
const IMAGE_STATUSES = new Set(["observed", "concept"]);
const PRODUCTION_READINESS = new Set(["specified-not-produced", "pilot-in-production"]);
const BOUNDARY_READINESS = new Set(["specified-not-active"]);

function duplicates(values) {
  const seen = new Set();
  return values.filter((value) => seen.has(value) || !seen.add(value));
}

export function validateAtlas(atlas, world = null) {
  const errors = [];
  if (!atlas || typeof atlas !== "object") return ["World atlas must be an object"];
  if (!atlas.atlasVersion) errors.push("World atlas is missing atlasVersion");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(atlas.lastUpdated ?? "")) errors.push("World atlas is missing a valid lastUpdated date");
  if (typeof atlas.canonPolicy?.imagesPaused !== "boolean") errors.push("World atlas must declare whether playable-scene generation is paused");
  if (atlas.canonPolicy?.atlasConceptImagesAllowed !== true) errors.push("World atlas must distinguish concept imagery from playable-scene generation");
  if (!Array.isArray(atlas.levels) || !atlas.levels.length) errors.push("World atlas must contain levels");
  if (!Array.isArray(atlas.regions)) errors.push("World atlas regions must be an array");
  if (!Array.isArray(atlas.connections)) errors.push("World atlas connections must be an array");

  const levels = new Map((atlas.levels ?? []).map((level) => [level.id, level]));
  const regions = new Map((atlas.regions ?? []).map((region) => [region.id, region]));
  const connections = new Map((atlas.connections ?? []).map((connection) => [connection.id, connection]));
  for (const id of duplicates((atlas.levels ?? []).map((entry) => entry.id))) errors.push(`Duplicate level id: ${id}`);
  for (const id of duplicates((atlas.regions ?? []).map((entry) => entry.id))) errors.push(`Duplicate region id: ${id}`);
  for (const id of duplicates((atlas.connections ?? []).map((entry) => entry.id))) errors.push(`Duplicate connection id: ${id}`);

  if (atlas.productionFocus) {
    const focus = atlas.productionFocus;
    if (!levels.has(focus.levelId)) errors.push(`Production focus references missing level ${focus.levelId}`);
    if (!connections.has(focus.entryConnectionId)) errors.push(`Production focus references missing connection ${focus.entryConnectionId}`);
    if (!PRODUCTION_READINESS.has(focus.phase)) errors.push(`Invalid production focus phase: ${focus.phase}`);
    if (!Number.isInteger(focus.pilotSceneCount) || focus.pilotSceneCount < 1) errors.push("Production focus needs a positive pilot scene count");
    if (!Number.isInteger(focus.generatedCandidateCount) || focus.generatedCandidateCount < 0 || focus.generatedCandidateCount > focus.pilotSceneCount) errors.push("Production focus has an invalid generated candidate count");
    if (!Number.isInteger(focus.reviewedSceneCount) || focus.reviewedSceneCount < 0 || focus.reviewedSceneCount > focus.generatedCandidateCount) errors.push("Production focus has an invalid reviewed scene count");
    if (focus.phase === "pilot-in-production" && atlas.canonPolicy.imagesPaused) errors.push("Pilot production cannot remain image-paused");
    if (!focus.summary?.trim()) errors.push("Production focus needs a summary");
  }

  for (const level of atlas.levels ?? []) {
    if (!/^LV-\d{3}(?:\.\d+)?$/.test(level.id ?? "")) errors.push(`Invalid level id: ${level.id}`);
    if (!LEVEL_STATUSES.has(level.status)) errors.push(`Invalid level status for ${level.id}: ${level.status}`);
    if (!Array.isArray(level.spatialDNA) || level.spatialDNA.length < 3) errors.push(`${level.id} needs at least three spatial DNA rules`);
    if (!Array.isArray(level.forbiddenDrift) || level.forbiddenDrift.length < 3) errors.push(`${level.id} needs at least three forbidden drift rules`);
    if (!level.narrativeFunction?.trim()) errors.push(`${level.id} needs a narrative function`);
    if (!level.spatialStructure?.trim()) errors.push(`${level.id} needs a spatial structure description`);
    const wikiLists = [
      ["environmentalRules", 3],
      ["phenomena", 2],
      ["hazards", 2],
      ["entrances", 1],
      ["exits", 1],
      ["openQuestions", 2],
    ];
    for (const [field, minimum] of wikiLists) {
      if (!Array.isArray(level[field]) || level[field].length < minimum) {
        errors.push(`${level.id} needs at least ${minimum} ${field} entries`);
      }
    }
    if (!IMAGE_STATUSES.has(level.representativeImage?.status)) errors.push(`${level.id} needs a valid representative image status`);
    for (const field of ["src", "alt", "caption", "label", "canonScope"]) {
      if (!level.representativeImage?.[field]?.trim()) errors.push(`${level.id} representative image is missing ${field}`);
    }
    for (const field of ["scale", "navigability", "environmentalPressure", "primaryRisk"]) {
      if (!level.classification?.[field]?.trim()) errors.push(`${level.id} classification is missing ${field}`);
    }
    if (!Array.isArray(level.sensoryProfile) || level.sensoryProfile.length !== 3) errors.push(`${level.id} needs exactly three sensory profile entries`);
    if (!Array.isArray(level.experienceArc) || level.experienceArc.length !== 3) errors.push(`${level.id} needs exactly three experience arc entries`);
    if (!Array.isArray(level.keywords) || level.keywords.length < 4) errors.push(`${level.id} needs at least four keywords`);
    if (level.productionSpec) {
      const spec = level.productionSpec;
      if (!PRODUCTION_READINESS.has(spec.readiness)) errors.push(`${level.id} has invalid production readiness`);
      if (!spec.specVersion?.trim() || !spec.pilotObjective?.trim()) errors.push(`${level.id} production spec needs a version and objective`);
      if (!Number.isInteger(spec.pilotSceneCount) || spec.pilotSceneCount < 1) errors.push(`${level.id} production spec needs a positive pilot scene count`);
      if (!Array.isArray(spec.pilotBeats) || spec.pilotBeats.length !== spec.pilotSceneCount) errors.push(`${level.id} pilot beat count must match pilot scene count`);
      if (!Array.isArray(spec.signatureSpaces) || spec.signatureSpaces.length < 4 || spec.signatureSpaces.length > 6) errors.push(`${level.id} needs four to six signature spaces`);
      if (!Array.isArray(spec.variationAxes) || spec.variationAxes.length < 4) errors.push(`${level.id} needs at least four variation axes`);
      if (!Array.isArray(spec.cameraGrammar) || spec.cameraGrammar.length < 3) errors.push(`${level.id} needs at least three camera grammar rules`);
      if (!Array.isArray(spec.imagePromptRules) || spec.imagePromptRules.length < 5) errors.push(`${level.id} needs at least five image prompt rules`);
      if (!Array.isArray(spec.continuityRules) || spec.continuityRules.length < 3) errors.push(`${level.id} needs at least three continuity rules`);
      if (!Array.isArray(spec.acceptanceCriteria) || spec.acceptanceCriteria.length < 6) errors.push(`${level.id} needs at least six acceptance criteria`);
      for (const field of ["annotationOrder", "defaultVisibleRoutes", "threeRouteUse", "fourPlusUse", "walkableRouteRule", "falseRouteRule"]) {
        if (!spec.routePolicy?.[field]?.trim()) errors.push(`${level.id} route policy is missing ${field}`);
      }
      for (const beat of spec.pilotBeats ?? []) {
        if (!beat.id?.trim() || !beat.title?.trim() || !beat.purpose?.trim() || !beat.topologyIntent?.trim()) errors.push(`${level.id} has an incomplete pilot beat`);
        if (beat.status && !/^L\d{2}-\d{4}$/.test(beat.candidateSceneId ?? "")) errors.push(`${beat.id} has an invalid candidate scene id`);
      }
      for (const space of spec.signatureSpaces ?? []) {
        if (!space.id?.trim() || !space.title?.trim() || !space.role?.trim()) errors.push(`${level.id} has an incomplete signature space`);
        if (!Array.isArray(space.requiredCues) || space.requiredCues.length < 3) errors.push(`${space.id} needs at least three required cues`);
        if (!Array.isArray(space.forbiddenCues) || space.forbiddenCues.length < 2) errors.push(`${space.id} needs at least two forbidden cues`);
      }
    }
    if (level.kind === "sublevel") {
      if (!levels.has(level.parentLevelId)) errors.push(`${level.id} has missing parent ${level.parentLevelId}`);
      if (levels.get(level.parentLevelId)?.kind !== "level") errors.push(`${level.id} parent must be a top-level level`);
    } else if (level.kind !== "level" || level.parentLevelId !== null) {
      errors.push(`${level.id} has invalid kind or parent`);
    }
    for (const regionId of level.regionIds ?? []) {
      if (!regions.has(regionId)) errors.push(`${level.id} references missing region ${regionId}`);
      else if (regions.get(regionId).levelId !== level.id) errors.push(`${regionId} does not belong to ${level.id}`);
    }
    for (const sublevelId of level.sublevelIds ?? []) {
      if (!levels.has(sublevelId)) errors.push(`${level.id} references missing sublevel ${sublevelId}`);
      else if (levels.get(sublevelId).parentLevelId !== level.id) errors.push(`${sublevelId} is not a child of ${level.id}`);
    }
    if (["reinterpretation", "hybrid"].includes(level.origin) && !(level.sourceUrls?.length > 0)) {
      errors.push(`${level.id} reinterprets source material but has no source URL`);
    }
  }

  for (const region of atlas.regions ?? []) {
    if (!/^REG-[A-Z0-9-]+$/.test(region.id ?? "")) errors.push(`Invalid region id: ${region.id}`);
    if (!levels.has(region.levelId)) errors.push(`${region.id} has missing level ${region.levelId}`);
    if (!REGION_STATUSES.has(region.status)) errors.push(`Invalid region status for ${region.id}: ${region.status}`);
    if (!Array.isArray(region.grammar) || region.grammar.length < 3) errors.push(`${region.id} needs at least three grammar rules`);
  }

  const worldScenes = new Map((world?.scenes ?? []).map((scene) => [scene.id, scene]));
  for (const connection of atlas.connections ?? []) {
    if (!levels.has(connection.fromLevelId) || !levels.has(connection.toLevelId)) errors.push(`${connection.id} references a missing level`);
    if (connection.direction !== "one-way") errors.push(`${connection.id} must be one-way`);
    if (!CONNECTION_STATUSES.has(connection.status)) errors.push(`Invalid connection status for ${connection.id}: ${connection.status}`);
    if (connection.status === "reserved") {
      if (!connection.sourceSceneId || !connection.sourcePathId) errors.push(`${connection.id} reserved boundary needs a source scene and path`);
      if (!connection.boundaryContract) errors.push(`${connection.id} reserved boundary needs a boundary contract`);
      const scene = worldScenes.get(connection.sourceSceneId);
      if (world && !scene) errors.push(`${connection.id} references missing scene ${connection.sourceSceneId}`);
      if (scene && !scene.paths.some((path) => path.id === connection.sourcePathId)) errors.push(`${connection.id} references missing path ${connection.sourcePathId}`);
      const contract = connection.boundaryContract;
      if (contract) {
        if (!BOUNDARY_READINESS.has(contract.readiness)) errors.push(`${connection.id} has invalid boundary readiness`);
        if (!contract.contractVersion?.trim()) errors.push(`${connection.id} boundary contract needs a version`);
        if (!/^L\d{2}-\d{4}$/.test(contract.plannedArrivalSceneId ?? "")) errors.push(`${connection.id} has invalid planned arrival scene id`);
        if (contract.sourceSnapshot?.sceneId !== connection.sourceSceneId || contract.sourceSnapshot?.pathId !== connection.sourcePathId) errors.push(`${connection.id} source snapshot does not match its reserved scene and path`);
        if (!Array.isArray(contract.transitionBeats) || contract.transitionBeats.length !== 3) errors.push(`${connection.id} needs exactly three transition beats`);
        if (!Array.isArray(contract.materialContinuity) || contract.materialContinuity.length < 4) errors.push(`${connection.id} needs at least four material continuity rules`);
        if (!Array.isArray(contract.interactionContract) || contract.interactionContract.length < 4) errors.push(`${connection.id} needs at least four interaction rules`);
        if (!Array.isArray(contract.activationGates) || contract.activationGates.length < 5) errors.push(`${connection.id} needs at least five activation gates`);
        if (!Number.isFinite(contract.cameraContract?.heightMeters) || !Number.isFinite(contract.cameraContract?.lensEquivalentMm)) errors.push(`${connection.id} boundary camera contract is incomplete`);
        const sourcePath = scene?.paths.find((path) => path.id === connection.sourcePathId);
        if (scene && contract.sourceSnapshot?.cameraHeightMeters !== scene.camera?.heightMeters) errors.push(`${connection.id} source snapshot camera height drifted from ${scene.id}`);
        if (scene && contract.sourceSnapshot?.lensEquivalentMm !== scene.camera?.lensEquivalentMm) errors.push(`${connection.id} source snapshot lens drifted from ${scene.id}`);
        if (sourcePath && contract.sourceSnapshot?.movementDirection !== sourcePath.movementDirection) errors.push(`${connection.id} source snapshot movement direction drifted from ${sourcePath.id}`);
      }
    }
  }
  if (atlas.productionFocus) {
    const focusLevel = levels.get(atlas.productionFocus.levelId);
    if (!focusLevel?.productionSpec) errors.push(`Production focus ${atlas.productionFocus.levelId} needs a production spec`);
    if (focusLevel?.productionSpec?.pilotSceneCount !== atlas.productionFocus.pilotSceneCount) errors.push("Production focus pilot count must match its level production spec");
    const focusConnection = connections.get(atlas.productionFocus.entryConnectionId);
    if (focusConnection?.toLevelId !== atlas.productionFocus.levelId) errors.push("Production focus entry connection must lead to the focus level");
  }
  return errors;
}

export function createAtlasIndex(atlas) {
  const levels = new Map(atlas.levels.map((level) => [level.id, level]));
  const regionsByLevel = new Map(atlas.levels.map((level) => [level.id, []]));
  const connectionsByLevel = new Map(atlas.levels.map((level) => [level.id, []]));
  for (const region of atlas.regions) regionsByLevel.get(region.levelId)?.push(region);
  for (const connection of atlas.connections) {
    connectionsByLevel.get(connection.fromLevelId)?.push({ ...connection, relation: "outgoing" });
    connectionsByLevel.get(connection.toLevelId)?.push({ ...connection, relation: "incoming" });
  }
  return { levels, regionsByLevel, connectionsByLevel };
}
