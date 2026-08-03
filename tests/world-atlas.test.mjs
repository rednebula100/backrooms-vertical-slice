import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { validateAtlas, createAtlasIndex } from "../src/world-atlas.mjs";

const atlas = JSON.parse(await readFile(new URL("../public/world/atlas.json", import.meta.url), "utf8"));
const world = JSON.parse(await readFile(new URL("../public/scenes/scenes.json", import.meta.url), "utf8"));
const staging = JSON.parse(await readFile(new URL("../public/scenes/staging-scenes.json", import.meta.url), "utf8"));

test("world atlas is internally consistent", () => {
  assert.deepEqual(validateAtlas(atlas, world), []);
});

test("atlas index exposes regions and both sides of connections", () => {
  const index = createAtlasIndex(atlas);
  assert.equal(index.regionsByLevel.get("LV-000").length, 3);
  assert.ok(index.connectionsByLevel.get("LV-000.1").some((entry) => entry.relation === "incoming"));
});

test("playable generation is limited to the inactive Level 0.1 pilot", () => {
  assert.equal(atlas.canonPolicy.imagesPaused, false);
  assert.equal(atlas.canonPolicy.atlasConceptImagesAllowed, true);
  assert.deepEqual(atlas.levels.filter((level) => level.status === "in-production").map((level) => level.id), ["LV-000", "LV-000.1"]);
  assert.ok(atlas.connections.every((connection) => connection.status !== "active"));
});

test("every atlas entry has a real representative image asset", async () => {
  for (const level of atlas.levels) {
    const relativePath = level.representativeImage.src.replace(/^\.\//, "");
    const image = await stat(new URL(`../public/${relativePath}`, import.meta.url));
    assert.ok(image.isFile(), `${level.id} representative image must be a file`);
    assert.ok(image.size > 100_000, `${level.id} representative image is unexpectedly small`);
  }
});

test("Level 0.1 has one staged candidate in its five-scene pilot", () => {
  const level = atlas.levels.find((entry) => entry.id === "LV-000.1");
  assert.equal(atlas.productionFocus.levelId, level.id);
  assert.equal(atlas.productionFocus.phase, "pilot-in-production");
  assert.equal(atlas.productionFocus.generatedCandidateCount, 1);
  assert.equal(atlas.productionFocus.reviewedSceneCount, 0);
  assert.equal(level.productionSpec.pilotSceneCount, 5);
  assert.equal(level.productionSpec.pilotBeats.length, 5);
  assert.equal(level.productionSpec.signatureSpaces.length, 5);
  assert.match(level.productionSpec.routePolicy.fourPlusUse, /희귀 승인/);
  assert.equal(level.productionSpec.pilotBeats[0].candidateSceneId, "L01-0001");
  assert.equal(level.productionSpec.pilotBeats[0].status, "candidate-awaiting-human-mask");
  assert.equal(staging.batch.id, "L01-PILOT-001");
  assert.equal(staging.candidates.length, 1);
  assert.equal(staging.candidates[0].id, "L01-0001");
  assert.equal(staging.candidates[0].sourcePathId, "L0-0009A-P1");
  assert.equal(staging.candidates[0].status, "awaiting-route-annotation");
});

test("the reserved Level 0 to 0.1 boundary is anchored to the live source snapshot", () => {
  const connection = atlas.connections.find((entry) => entry.id === "CON-L0-L01-ENTRY");
  const scene = world.scenes.find((entry) => entry.id === connection.sourceSceneId);
  const path = scene.paths.find((entry) => entry.id === connection.sourcePathId);
  const contract = connection.boundaryContract;
  assert.equal(contract.readiness, "specified-not-active");
  assert.equal(contract.plannedArrivalSceneId, "L01-0001");
  assert.equal(contract.sourceSnapshot.cameraHeightMeters, scene.camera.heightMeters);
  assert.equal(contract.sourceSnapshot.lensEquivalentMm, scene.camera.lensEquivalentMm);
  assert.equal(contract.sourceSnapshot.movementDirection, path.movementDirection);
  assert.equal(contract.activationGates.length, 6);
  assert.equal(path.targetSceneId, null);
});
