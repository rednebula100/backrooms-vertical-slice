import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateFrontiers,
  validateGenerationBatch,
  validateRouteReviews,
  validateWorld,
} from "../src/scene-model.mjs";
import { validateProductionQueue } from "../src/production-queue.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(root, "public", "scenes", "scenes.json");
const frontiersPath = path.join(root, "public", "scenes", "production-frontiers.json");
const routeReviewsPath = path.join(root, "public", "scenes", "route-reviews.json");
const generationBatchPath = path.join(root, "production", "generation-jobs.json");
const stagingPath = path.join(root, "public", "scenes", "staging-scenes.json");
const annotationsPath = path.join(root, "public", "scenes", "manual-route-annotations.json");
const world = JSON.parse(await readFile(registryPath, "utf8"));
const frontiers = JSON.parse(await readFile(frontiersPath, "utf8"));
const routeReviews = JSON.parse(await readFile(routeReviewsPath, "utf8"));
const generationBatch = JSON.parse(await readFile(generationBatchPath, "utf8"));
const staging = JSON.parse(await readFile(stagingPath, "utf8"));
const annotations = JSON.parse(await readFile(annotationsPath, "utf8"));
const errors = [
  ...validateWorld(world),
  ...validateFrontiers(world, frontiers),
  ...validateRouteReviews(world, routeReviews),
  ...validateGenerationBatch(world, generationBatch),
  ...validateProductionQueue(world, frontiers, annotations, staging),
];

async function validatePng(source, asset, { requireAlpha = false } = {}) {
  const assetPath = path.join(root, "public", source.replace(/^\//, ""));
  try {
    const bytes = await readFile(assetPath);
    const isPng = bytes.length >= 24 && bytes.subarray(1, 4).toString("ascii") === "PNG";
    if (!isPng) {
      errors.push(`Registered image is not a PNG: ${source}`);
      return;
    }
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (width !== asset.width || height !== asset.height) {
      errors.push(`Image dimensions do not match registry for ${source}: ${width}x${height}`);
    }
    if (requireAlpha && bytes[25] !== 6) {
      errors.push(`Registered image must be an RGBA PNG: ${source}`);
    }
  } catch {
    errors.push(`Missing registered image: ${source}`);
  }
}

for (const scene of world.scenes) await validatePng(scene.image, scene.asset);
for (const candidate of staging.candidates) await validatePng(candidate.image, candidate.asset);
await validatePng(world.contentBoundary.symbolImage, world.contentBoundary.asset, { requireAlpha: true });
await validatePng(world.contentBoundary.epilogueImage, world.contentBoundary.asset);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${world.scenes.length} scenes, ${staging.candidates.length} staged candidate, ${frontiers.frontiers.length} production frontiers, ${generationBatch.jobs.length} generation jobs, and 2 boundary assets.`);
}
