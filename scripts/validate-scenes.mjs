import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateFrontiers, validateWorld } from "../src/scene-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(root, "public", "scenes", "scenes.json");
const frontiersPath = path.join(root, "public", "scenes", "production-frontiers.json");
const world = JSON.parse(await readFile(registryPath, "utf8"));
const frontiers = JSON.parse(await readFile(frontiersPath, "utf8"));
const errors = [...validateWorld(world), ...validateFrontiers(world, frontiers)];

for (const scene of world.scenes) {
  const assetPath = path.join(root, "public", scene.image.replace(/^\//, ""));
  try {
    const bytes = await readFile(assetPath);
    const isPng = bytes.length >= 24 && bytes.subarray(1, 4).toString("ascii") === "PNG";
    if (!isPng) {
      errors.push(`Registered image is not a PNG: ${scene.image}`);
      continue;
    }
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (width !== scene.asset.width || height !== scene.asset.height) {
      errors.push(`Image dimensions do not match registry for ${scene.image}: ${width}x${height}`);
    }
  } catch {
    errors.push(`Missing registered image: ${scene.image}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${world.scenes.length} scenes and ${frontiers.frontiers.length} production frontiers.`);
}
