import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { validateAtlas, createAtlasIndex } from "../src/world-atlas.mjs";

const atlas = JSON.parse(await readFile(new URL("../public/world/atlas.json", import.meta.url), "utf8"));
const world = JSON.parse(await readFile(new URL("../public/scenes/scenes.json", import.meta.url), "utf8"));

test("world atlas is internally consistent", () => {
  assert.deepEqual(validateAtlas(atlas, world), []);
});

test("atlas index exposes regions and both sides of connections", () => {
  const index = createAtlasIndex(atlas);
  assert.equal(index.regionsByLevel.get("LV-000").length, 3);
  assert.ok(index.connectionsByLevel.get("LV-000.1").some((entry) => entry.relation === "incoming"));
});

test("new atlas entries remain documentation-only", () => {
  assert.equal(atlas.canonPolicy.imagesPaused, true);
  assert.equal(atlas.canonPolicy.atlasConceptImagesAllowed, true);
  assert.equal(atlas.levels.filter((level) => level.status === "in-production").length, 1);
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
