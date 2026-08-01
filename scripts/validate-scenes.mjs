import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateWorld } from "../src/scene-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(root, "public", "scenes", "scenes.json");
const world = JSON.parse(await readFile(registryPath, "utf8"));
const errors = validateWorld(world);

for (const scene of world.scenes) {
  const assetPath = path.join(root, "public", scene.image.replace(/^\//, ""));
  try {
    await access(assetPath);
  } catch {
    errors.push(`Missing registered image: ${scene.image}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${world.scenes.length} scenes with no broken assets or connections.`);
}

