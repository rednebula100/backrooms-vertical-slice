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
import { validateRoutePacketRegistry } from "../src/route-packets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(root, "public", "scenes", "scenes.json");
const frontiersPath = path.join(root, "public", "scenes", "production-frontiers.json");
const routeReviewsPath = path.join(root, "public", "scenes", "route-reviews.json");
const generationBatchPath = path.join(root, "production", "generation-jobs.json");
const stagingPath = path.join(root, "public", "scenes", "staging-scenes.json");
const annotationsPath = path.join(root, "public", "scenes", "manual-route-annotations.json");
const routePacketsPath = path.join(root, "public", "scenes", "route-packets.json");
const world = JSON.parse(await readFile(registryPath, "utf8"));
const frontiers = JSON.parse(await readFile(frontiersPath, "utf8"));
const routeReviews = JSON.parse(await readFile(routeReviewsPath, "utf8"));
const generationBatch = JSON.parse(await readFile(generationBatchPath, "utf8"));
const staging = JSON.parse(await readFile(stagingPath, "utf8"));
const annotations = JSON.parse(await readFile(annotationsPath, "utf8"));
const routePackets = JSON.parse(await readFile(routePacketsPath, "utf8"));
const errors = [
  ...validateWorld(world),
  ...validateFrontiers(world, frontiers),
  ...validateRouteReviews(world, routeReviews),
  ...validateGenerationBatch(world, generationBatch),
  ...validateProductionQueue(world, frontiers, annotations, staging),
  ...validateRoutePacketRegistry(world, annotations, routePackets),
];

async function pngDimensions(source) {
  const assetPath = path.join(root, "public", source.replace(/^\//, ""));
  const bytes = await readFile(assetPath);
  if (bytes.length < 24 || bytes.subarray(1, 4).toString("ascii") !== "PNG") throw new Error("not a PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

async function validatePng(source, asset, { requireAlpha = false } = {}) {
  try {
    const { width, height, colorType } = await pngDimensions(source);
    if (width !== asset.width || height !== asset.height) {
      errors.push(`Image dimensions do not match registry for ${source}: ${width}x${height}`);
    }
    if (requireAlpha && colorType !== 6) {
      errors.push(`Registered image must be an RGBA PNG: ${source}`);
    }
  } catch {
    errors.push(`Missing registered image: ${source}`);
  }
}

for (const scene of world.scenes) await validatePng(scene.image, scene.asset);
for (const candidate of staging.candidates) await validatePng(candidate.image, candidate.asset);
for (const packet of routePackets.packets) {
  const scene = world.scenes.find((candidate) => candidate.id === packet.sourceSceneId);
  if (scene && packet.references.cleanSource !== scene.image) errors.push(`Route packet ${packet.id} clean source does not match ${scene.id}`);
  await validatePng(packet.references.routeMap, scene?.asset ?? { width: 0, height: 0 });
  await validatePng(packet.references.routeCrop, { width: packet.cropBox.width, height: packet.cropBox.height });
}
await validatePng(world.contentBoundary.symbolImage, world.contentBoundary.asset, { requireAlpha: true });
await validatePng(world.contentBoundary.epilogueImage, world.contentBoundary.asset);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${world.scenes.length} scenes, ${staging.candidates.length} staged candidate, ${frontiers.frontiers.length} production frontiers, ${generationBatch.jobs.length} generation jobs, ${routePackets.packets.length} route packets, and 2 boundary assets.`);
}
