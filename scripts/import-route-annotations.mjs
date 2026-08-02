import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promoteReviewedCandidates } from "../src/candidate-promotion.mjs";
import { validateProductionQueue } from "../src/production-queue.mjs";
import { normalizeAnnotationImport } from "../src/route-annotations.mjs";
import { validateFrontiers, validateRouteReviews, validateWorld } from "../src/scene-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!sourcePath) {
  console.error("Usage: npm run annotations:import -- <exported-json-path>");
  process.exit(1);
}

const destinationPath = path.join(root, "public", "scenes", "manual-route-annotations.json");
const stagingPath = path.join(root, "public", "scenes", "staging-scenes.json");
const registryPath = path.join(root, "public", "scenes", "production-frontiers.json");
const worldPath = path.join(root, "public", "scenes", "scenes.json");
const routeReviewsPath = path.join(root, "public", "scenes", "route-reviews.json");
const [payload, world, staging, previous, registry, routeReviews] = await Promise.all([
  readFile(sourcePath, "utf8").then(JSON.parse),
  readFile(worldPath, "utf8").then(JSON.parse),
  readFile(stagingPath, "utf8").then(JSON.parse),
  readFile(destinationPath, "utf8").then(JSON.parse),
  readFile(registryPath, "utf8").then(JSON.parse),
  readFile(routeReviewsPath, "utf8").then(JSON.parse),
]);

const normalized = normalizeAnnotationImport(payload, world, staging);
if (normalized.errors.length) {
  console.error(normalized.errors.join("\n"));
  process.exit(1);
}

const previousById = new Map(previous.scenes.map((scene) => [scene.sceneId, scene]));
const changedSceneIds = normalized.value.scenes
  .filter((scene) => JSON.stringify(previousById.get(scene.sceneId)) !== JSON.stringify(scene))
  .map((scene) => scene.sceneId);
const normalizedById = new Map(normalized.value.scenes.map((scene) => [scene.sceneId, scene]));
for (const candidate of staging.candidates ?? []) {
  const record = normalizedById.get(candidate.id);
  candidate.status = record.annotationStatus === "staging-masks-confirmed"
    ? "ready-for-promotion"
    : record.annotationStatus === "staging-awaiting-approval"
      ? "awaiting-review-approval"
      : "awaiting-route-annotation";
  candidate.reviewStatus = record.reviewComplete ? "route-annotation-complete" : "needs-human-route-annotation";
  candidate.observedVisibleRouteCount = record.observedVisibleRouteCount;
}
staging.updatedAt = normalized.value.updatedAt;
const promoted = promoteReviewedCandidates({
  world,
  registry,
  annotations: normalized.value,
  queue: staging,
  routeReviews,
  now: normalized.value.updatedAt,
});
const validationErrors = [
  ...validateWorld(promoted.world),
  ...validateFrontiers(promoted.world, promoted.registry),
  ...validateRouteReviews(promoted.world, promoted.routeReviews),
  ...validateProductionQueue(promoted.world, promoted.registry, promoted.annotations, promoted.queue),
];
if (validationErrors.length) {
  console.error(validationErrors.join("\n"));
  process.exit(1);
}

const outputs = [
  [destinationPath, promoted.annotations],
  [stagingPath, promoted.queue],
  [worldPath, promoted.world],
  [registryPath, promoted.registry],
  [routeReviewsPath, promoted.routeReviews],
];
for (const [target, value] of outputs) {
  await writeFile(`${target}.${process.pid}.tmp`, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
for (const [target] of outputs) await rename(`${target}.${process.pid}.tmp`, target);

console.log(`Imported ${normalized.value.scenes.length} scene annotations.`);
console.log(`Changed ${changedSceneIds.length}: ${changedSceneIds.join(", ") || "none"}`);
console.log(`Promoted ${promoted.promotedSceneIds.length}: ${promoted.promotedSceneIds.join(", ") || "none"}`);
console.log(`Registered ${promoted.registeredRouteIds.length} routes from the full editor snapshot.`);
