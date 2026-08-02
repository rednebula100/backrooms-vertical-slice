import { spawnSync } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRoutePacketRegistry, validateRoutePacketRegistry } from "../src/route-packets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => readFile(path.join(root, relativePath), "utf8").then(JSON.parse);
const sceneIds = process.argv.slice(2);
const [world, annotations, overrides] = await Promise.all([
  readJson("public/scenes/scenes.json"),
  readJson("public/scenes/manual-route-annotations.json"),
  readJson("production/route-packet-overrides.json"),
]);
if (overrides.worldVersion !== world.worldVersion) throw new Error("Route-packet overrides use a stale world version");
const registry = buildRoutePacketRegistry(world, annotations, overrides, {
  sceneIds: sceneIds.length ? sceneIds : null,
});
const errors = validateRoutePacketRegistry(world, annotations, registry);
if (errors.length) throw new Error(errors.join("\n"));

const registryPath = path.join(root, "public", "scenes", "route-packets.json");
const temporaryPath = `${registryPath}.${process.pid}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
await rename(temporaryPath, registryPath);

const renderer = spawnSync("python", [
  path.join(root, "scripts", "render-route-packet-assets.py"),
  "--root", root,
  "--registry", registryPath,
], { encoding: "utf8" });
if (renderer.status !== 0) {
  throw new Error(renderer.stderr || "Unable to render route-packet assets. Install Python Pillow and retry.");
}
process.stdout.write(renderer.stdout);
console.log(`Built ${registry.packets.length} route packets at ${path.relative(root, registryPath)}.`);
