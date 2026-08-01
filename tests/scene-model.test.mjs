import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  indexScenes,
  makeSavePayload,
  reachableImages,
  restoreSceneId,
  validateWorld,
} from "../src/scene-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const world = JSON.parse(await readFile(path.join(root, "public/scenes/scenes.json"), "utf8"));

test("scene registry is structurally valid", () => {
  assert.deepEqual(validateWorld(world), []);
});

test("the opening branches to two fixed, distinct scenes", () => {
  const opening = indexScenes(world).get("L0-0001");
  assert.deepEqual(opening.paths.map((path) => path.targetSceneId), ["L0-0002A", "L0-0002B"]);
  assert.equal(new Set(opening.paths.map((path) => path.targetSceneId)).size, 2);
});

test("follow-up routes are explicit pending production frontiers", () => {
  const scenes = indexScenes(world);
  for (const id of ["L0-0002A", "L0-0002B"]) {
    const [path] = scenes.get(id).paths;
    assert.equal(path.status, "pending");
    assert.equal(path.frontier, true);
    assert.equal(path.targetSceneId, null);
  }
});

test("save payload stores at least scene_id and world_version", () => {
  assert.deepEqual(makeSavePayload("L0-0002A", world.worldVersion), {
    scene_id: "L0-0002A",
    world_version: world.worldVersion,
  });
});

test("restore accepts valid progress and rejects stale or missing scenes", () => {
  assert.equal(restoreSceneId(JSON.stringify(makeSavePayload("L0-0002B", world.worldVersion)), world), "L0-0002B");
  assert.equal(restoreSceneId(JSON.stringify(makeSavePayload("L0-0002B", "old")), world), "L0-0001");
  assert.equal(restoreSceneId(JSON.stringify(makeSavePayload("missing", world.worldVersion)), world), "L0-0001");
  assert.equal(restoreSceneId("broken", world), "L0-0001");
});

test("development direct entry overrides saved progress only for registered scenes", () => {
  const saved = JSON.stringify(makeSavePayload("L0-0002B", world.worldVersion));
  assert.equal(restoreSceneId(saved, world, "L0-0002A"), "L0-0002A");
  assert.equal(restoreSceneId(saved, world, "missing"), "L0-0002B");
});

test("opening scene preloads both reachable images", () => {
  const scenes = indexScenes(world);
  assert.deepEqual(reachableImages(scenes.get("L0-0001"), scenes), [
    "/scenes/L0-0002A/final/L0-0002A.png",
    "/scenes/L0-0002B/final/L0-0002B.png",
  ]);
});

test("opening mobile hit regions are large and non-overlapping", () => {
  const opening = indexScenes(world).get("L0-0001");
  const boxes = opening.paths.map((path) => {
    const xs = path.regions.mobile.map(([x]) => x);
    const ys = path.regions.mobile.map(([, y]) => y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  });
  const mobileScale = 364.4 / opening.asset.width;
  for (const box of boxes) {
    assert.ok((box.maxX - box.minX) * mobileScale >= 44);
    assert.ok((box.maxY - box.minY) * mobileScale >= 44);
  }
  assert.ok(boxes[0].maxX < boxes[1].minX);
});
