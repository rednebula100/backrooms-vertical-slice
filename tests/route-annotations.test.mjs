import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAnnotationImport } from "../src/route-annotations.mjs";

const region = { desktop: [[0, 0], [100, 0], [100, 100]], mobile: [[0, 0], [120, 0], [120, 120]] };
const world = {
  worldVersion: "test",
  scenes: [{ id: "S1", image: "/s1.png", asset: { width: 200, height: 150 }, paths: [{ id: "S1-P1" }] }],
};
const staging = {
  candidates: [{ id: "S2", staging: true, image: "/s2.png", asset: { width: 200, height: 150 }, paths: [] }],
};

test("annotation import preserves edits for every registered and staged scene", () => {
  const payload = {
    worldVersion: "test",
    scenes: [{
      sceneId: "S1",
      image: "/s1.png",
      reviewComplete: true,
      masks: [
        { id: "S1-P1", sourcePathId: "S1-P1", status: "pending", regions: region },
        { id: "MASK-S1-02", sourcePathId: null, status: "draft", regions: region },
      ],
    }, {
      sceneId: "S2",
      image: "/s2.png",
      reviewComplete: true,
      masks: [{ id: "MASK-S2-01", sourcePathId: null, status: "draft", regions: region }],
    }],
  };
  const result = normalizeAnnotationImport(payload, world, staging);
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.scenes.find((scene) => scene.sceneId === "S1").annotationStatus, "needs-route-registration");
  assert.equal(result.value.scenes.find((scene) => scene.sceneId === "S2").annotationStatus, "staging-masks-confirmed");
});

test("annotation import rejects partial exports and stale scene images", () => {
  const result = normalizeAnnotationImport({
    worldVersion: "test",
    scenes: [{ sceneId: "S1", image: "/old.png", masks: [{ id: "S1-P1", sourcePathId: "S1-P1", regions: region }] }],
  }, world, staging);
  assert.ok(result.errors.some((error) => error.includes("does not match")));
  assert.ok(result.errors.some((error) => error.includes("missing scene S2")));
});
