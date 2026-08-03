const LEVEL_STATUSES = new Set(["in-production", "skeleton", "concept"]);
const REGION_STATUSES = new Set(["observed", "planned", "concept"]);
const CONNECTION_STATUSES = new Set(["reserved", "concept"]);

function duplicates(values) {
  const seen = new Set();
  return values.filter((value) => seen.has(value) || !seen.add(value));
}

export function validateAtlas(atlas, world = null) {
  const errors = [];
  if (!atlas || typeof atlas !== "object") return ["World atlas must be an object"];
  if (!atlas.atlasVersion) errors.push("World atlas is missing atlasVersion");
  if (atlas.canonPolicy?.imagesPaused !== true) errors.push("World atlas must keep image generation paused");
  if (!Array.isArray(atlas.levels) || !atlas.levels.length) errors.push("World atlas must contain levels");
  if (!Array.isArray(atlas.regions)) errors.push("World atlas regions must be an array");
  if (!Array.isArray(atlas.connections)) errors.push("World atlas connections must be an array");

  const levels = new Map((atlas.levels ?? []).map((level) => [level.id, level]));
  const regions = new Map((atlas.regions ?? []).map((region) => [region.id, region]));
  const connections = new Map((atlas.connections ?? []).map((connection) => [connection.id, connection]));
  for (const id of duplicates((atlas.levels ?? []).map((entry) => entry.id))) errors.push(`Duplicate level id: ${id}`);
  for (const id of duplicates((atlas.regions ?? []).map((entry) => entry.id))) errors.push(`Duplicate region id: ${id}`);
  for (const id of duplicates((atlas.connections ?? []).map((entry) => entry.id))) errors.push(`Duplicate connection id: ${id}`);

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
      const scene = worldScenes.get(connection.sourceSceneId);
      if (world && !scene) errors.push(`${connection.id} references missing scene ${connection.sourceSceneId}`);
      if (scene && !scene.paths.some((path) => path.id === connection.sourcePathId)) errors.push(`${connection.id} references missing path ${connection.sourcePathId}`);
    }
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
