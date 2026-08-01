import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  indexScenes,
  makeSavePayload,
  reachableImages,
  restoreBoundaryPathId,
  restoreSceneId,
  validateFrontiers,
  validateWorld,
} from "../src/scene-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const world = JSON.parse(await readFile(path.join(root, "public/scenes/scenes.json"), "utf8"));
const frontiers = JSON.parse(await readFile(path.join(root, "public/scenes/production-frontiers.json"), "utf8"));

test("scene registry is structurally valid", () => {
  assert.deepEqual(validateWorld(world), []);
});

test("the opening branches to two fixed, distinct scenes", () => {
  const opening = indexScenes(world).get("L0-0001");
  assert.deepEqual(opening.paths.map((path) => path.targetSceneId), ["L0-0002A", "L0-0002B"]);
  assert.equal(new Set(opening.paths.map((path) => path.targetSceneId)).size, 2);
});

test("each opening branch has two fixed follow-ups", () => {
  const scenes = indexScenes(world);
  assert.equal(scenes.get("L0-0002A").paths[0].targetSceneId, "L0-0003A");
  assert.equal(scenes.get("L0-0003A").paths[0].targetSceneId, "L0-0004A");
  assert.equal(scenes.get("L0-0002B").paths[0].targetSceneId, "L0-0003B");
  assert.equal(scenes.get("L0-0003B").paths[0].targetSceneId, "L0-0004B");
});

test("only the opening scene exposes multiple routes", () => {
  for (const scene of world.scenes) {
    assert.equal(scene.paths.length, scene.id === world.startSceneId ? 2 : 1, scene.id);
  }
});

test("only the two bundle endpoints remain pending production frontiers", () => {
  const pending = world.scenes.flatMap((scene) => scene.paths.filter((path) => path.status === "pending").map((path) => [scene.id, path.id]));
  assert.deepEqual(pending, [["L0-0004A", "L0-0004A-P1"], ["L0-0004B", "L0-0004B-P1"]]);
  assert.deepEqual(validateFrontiers(world, frontiers), []);
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

test("content-boundary progress restores only a valid pending path", () => {
  const boundarySave = JSON.stringify(makeSavePayload("L0-0004B", world.worldVersion, {
    pending_path_id: "L0-0004B-P1",
    boundary_state: "symbol",
  }));
  assert.equal(restoreBoundaryPathId(boundarySave, world, "L0-0004B"), "L0-0004B-P1");
  assert.equal(restoreBoundaryPathId(boundarySave, world, "L0-0004A"), null);
  assert.equal(restoreBoundaryPathId(JSON.stringify(makeSavePayload("L0-0004B", "old", {
    pending_path_id: "L0-0004B-P1",
    boundary_state: "symbol",
  })), world, "L0-0004B"), null);
  assert.equal(restoreBoundaryPathId(JSON.stringify(makeSavePayload("L0-0003B", world.worldVersion, {
    pending_path_id: "L0-0003B-P1",
    boundary_state: "symbol",
  })), world, "L0-0003B"), null);
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

test("all registered scenes are reachable through fixed, non-merging paths", () => {
  const scenes = indexScenes(world);
  const reached = new Set();
  const incoming = new Map(world.scenes.map((scene) => [scene.id, 0]));
  const queue = [world.startSceneId];
  while (queue.length) {
    const sceneId = queue.shift();
    if (reached.has(sceneId)) continue;
    reached.add(sceneId);
    for (const path of scenes.get(sceneId).paths.filter((candidate) => candidate.status === "active")) {
      incoming.set(path.targetSceneId, incoming.get(path.targetSceneId) + 1);
      queue.push(path.targetSceneId);
    }
  }
  assert.equal(reached.size, world.scenes.length);
  assert.equal(incoming.get(world.startSceneId), 0);
  for (const scene of world.scenes.filter((candidate) => candidate.id !== world.startSceneId)) {
    assert.equal(incoming.get(scene.id), 1);
  }
});

test("scene provenance matches every active incoming path", () => {
  const scenes = indexScenes(world);
  for (const scene of world.scenes) {
    for (const path of scene.paths.filter((candidate) => candidate.status === "active")) {
      const target = scenes.get(path.targetSceneId);
      assert.equal(target.sourceSceneId, scene.id);
      assert.equal(target.sourcePathId, path.id);
    }
  }
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

test("hit regions cover vertical passage openings instead of foreground carpet wedges", () => {
  for (const scene of world.scenes) {
    for (const path of scene.paths) {
      for (const regionName of ["desktop", "mobile"]) {
        const xs = path.regions[regionName].map(([x]) => x);
        const ys = path.regions[regionName].map(([, y]) => y);
        const width = Math.max(...xs) - Math.min(...xs);
        const height = Math.max(...ys) - Math.min(...ys);
        const minY = Math.min(...ys);
        const maxY = Math.max(...path.regions[regionName].map(([, y]) => y));
        assert.ok(minY < scene.asset.height * 0.4, `${path.id} ${regionName} starts too low to cover the opening`);
        assert.ok(maxY < scene.asset.height * 0.7, `${path.id} ${regionName} extends into the foreground carpet`);
        assert.ok(height >= scene.asset.height * 0.18, `${path.id} ${regionName} is too short to cover the passage height`);
        assert.ok(height >= width * 0.8, `${path.id} ${regionName} is shaped like a floor wedge instead of an opening`);
      }
    }
  }
});

test("content boundary registers fixed 4:3 symbol and epilogue assets", () => {
  assert.equal(world.contentBoundary.asset.width / world.contentBoundary.asset.height, 4 / 3);
  assert.equal(world.contentBoundary.symbolImage, "/boundary/content-boundary-symbol.png");
  assert.equal(world.contentBoundary.epilogueImage, "/boundary/reset-epilogue.png");
});

test("content-boundary symbol is an RGBA PNG for floating over the page background", async () => {
  const bytes = await readFile(path.join(root, "public", world.contentBoundary.symbolImage.replace(/^\//, "")));
  assert.equal(bytes[25], 6);
});
