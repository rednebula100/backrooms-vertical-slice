import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAnnotationImport } from "../src/route-annotations.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!sourcePath) {
  console.error("Usage: npm run annotations:import -- <exported-json-path>");
  process.exit(1);
}

const destinationPath = path.join(root, "public", "scenes", "manual-route-annotations.json");
const stagingPath = path.join(root, "public", "scenes", "staging-scenes.json");
const [payload, world, staging, previous] = await Promise.all([
  readFile(sourcePath, "utf8").then(JSON.parse),
  readFile(path.join(root, "public", "scenes", "scenes.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "public", "scenes", "staging-scenes.json"), "utf8").then(JSON.parse),
  readFile(destinationPath, "utf8").then(JSON.parse),
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
const temporaryPath = `${destinationPath}.${process.pid}.tmp`;
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
const stagingTemporaryPath = `${stagingPath}.${process.pid}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(normalized.value, null, 2)}\n`, "utf8");
await writeFile(stagingTemporaryPath, `${JSON.stringify(staging, null, 2)}\n`, "utf8");
await rename(temporaryPath, destinationPath);
await rename(stagingTemporaryPath, stagingPath);

console.log(`Imported ${normalized.value.scenes.length} scene annotations.`);
console.log(`Changed ${changedSceneIds.length}: ${changedSceneIds.join(", ") || "none"}`);
