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
  validateGenerationBatch,
  validateRouteReviews,
  validateWorld,
} from "../src/scene-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const world = JSON.parse(await readFile(path.join(root, "public/scenes/scenes.json"), "utf8"));
const frontiers = JSON.parse(await readFile(path.join(root, "public/scenes/production-frontiers.json"), "utf8"));
const routeReviews = JSON.parse(await readFile(path.join(root, "public/scenes/route-reviews.json"), "utf8"));
const generationBatch = JSON.parse(await readFile(path.join(root, "production/generation-jobs.json"), "utf8"));

test("scene registry is structurally valid", () => {
  assert.deepEqual(validateWorld(world), []);
});

test("the opening branches to two fixed, distinct scenes", () => {
  const opening = indexScenes(world).get("L0-0001");
  assert.deepEqual(opening.paths.map((path) => path.targetSceneId), ["L0-0002A", "L0-0002B"]);
  assert.equal(new Set(opening.paths.map((path) => path.targetSceneId)).size, 2);
});

test("both opening branches reach the ten generated production scenes through fixed paths", () => {
  const scenes = indexScenes(world);
  assert.equal(scenes.get("L0-0002A").paths[0].targetSceneId, "L0-0003A");
  assert.equal(scenes.get("L0-0003A").paths[0].targetSceneId, "L0-0004A");
  assert.equal(scenes.get("L0-0004A").paths[0].targetSceneId, "L0-0005A");
  assert.equal(scenes.get("L0-0005A").paths[0].targetSceneId, "L0-0006A");
  assert.equal(scenes.get("L0-0006A").paths[0].targetSceneId, "L0-0007A");
  assert.equal(scenes.get("L0-0002B").paths[0].targetSceneId, "L0-0003B");
  assert.equal(scenes.get("L0-0003B").paths[0].targetSceneId, "L0-0004B");
  assert.equal(scenes.get("L0-0004B").paths[0].targetSceneId, "L0-0005B");
  assert.equal(scenes.get("L0-0005B").paths[0].targetSceneId, "L0-0006B");
  assert.equal(scenes.get("L0-0002B").paths[1].targetSceneId, "L0-0003C");
  assert.equal(scenes.get("L0-0003B").paths[1].targetSceneId, "L0-0004C");
  assert.equal(scenes.get("L0-0003B").paths[2].targetSceneId, "L0-0004D");
  assert.equal(scenes.get("L0-0004B").paths[1].targetSceneId, "L0-0005C");
  assert.equal(scenes.get("L0-0005A").paths[1].targetSceneId, "L0-0006C");
});

test("the ten-scene production set records the human-observed route distribution", () => {
  const routeCounts = generationBatch.jobs.map((job) => job.observedVisibleRouteCount);
  assert.deepEqual(routeCounts.sort(), [1, 1, 1, 1, 1, 2, 2, 2, 2, 2]);
  assert.equal(routeCounts.filter((count) => count >= 4).length, 0);
  assert.deepEqual(validateGenerationBatch(world, generationBatch), []);
});

test("every unproduced visible passage is a registered production frontier", () => {
  const pending = world.scenes.flatMap((scene) => scene.paths.filter((path) => path.status === "pending").map((path) => [scene.id, path.id]));
  const registered = frontiers.frontiers.map((frontier) => [frontier.current_scene_id, frontier.path_id]);
  const byPath = (first, second) => first[1].localeCompare(second[1]);
  assert.equal(pending.length, 16);
  assert.deepEqual(pending.sort(byPath), registered.sort(byPath));
  assert.equal(new Set(frontiers.frontiers.map((frontier) => frontier.branch_id)).size, pending.length);
  assert.deepEqual(validateFrontiers(world, frontiers), []);
});

test("route-review registry covers the ten generated scenes and keeps release gated", () => {
  assert.deepEqual(validateRouteReviews(world, routeReviews), []);
  assert.equal(validateRouteReviews(world, routeReviews, { requirePlaytestPass: true }).length, 10);
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
  const pendingSceneId = "L0-0008A";
  const pendingPathId = "L0-0008A-P1";
  const boundarySave = JSON.stringify(makeSavePayload(pendingSceneId, world.worldVersion, {
    pending_path_id: pendingPathId,
    boundary_state: "symbol",
  }));
  assert.equal(restoreBoundaryPathId(boundarySave, world, pendingSceneId), pendingPathId);
  assert.equal(restoreBoundaryPathId(boundarySave, world, "L0-0007A"), null);
  assert.equal(restoreBoundaryPathId(JSON.stringify(makeSavePayload(pendingSceneId, "old", {
    pending_path_id: pendingPathId,
    boundary_state: "symbol",
  })), world, pendingSceneId), null);
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

test("mobile hit regions are large and distinct in every multi-route scene", () => {
  for (const scene of world.scenes.filter((candidate) => candidate.paths.length > 1)) {
    const boxes = scene.paths.map((path) => {
      const xs = path.regions.mobile.map(([x]) => x);
      const ys = path.regions.mobile.map(([, y]) => y);
      return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    });
    const mobileScale = 364.4 / scene.asset.width;
    for (const box of boxes) {
      assert.ok((box.maxX - box.minX) * mobileScale >= 44, scene.id);
      assert.ok((box.maxY - box.minY) * mobileScale >= 44, scene.id);
    }
    assert.equal(new Set(scene.paths.map((path) => JSON.stringify(path.regions.mobile))).size, scene.paths.length, scene.id);
  }
});

test("hit regions retain enough vertical passage area for reliable interaction", () => {
  for (const scene of world.scenes) {
    for (const path of scene.paths) {
      for (const regionName of ["desktop", "mobile"]) {
        const xs = path.regions[regionName].map(([x]) => x);
        const ys = path.regions[regionName].map(([, y]) => y);
        const width = Math.max(...xs) - Math.min(...xs);
        const height = Math.max(...ys) - Math.min(...ys);
        const minY = Math.min(...ys);
        assert.ok(minY < scene.asset.height * 0.4, `${path.id} ${regionName} starts too low to cover the opening`);
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
