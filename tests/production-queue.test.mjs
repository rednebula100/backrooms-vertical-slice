import test from "node:test";
import assert from "node:assert/strict";
import { classifyFrontiers, deriveCandidateStatus, validateProductionQueue } from "../src/production-queue.mjs";

const path = { id: "S1-P1", status: "pending", frontier: true, frontierBranchId: "B1" };
const secondPath = { id: "S1-P2", status: "pending", frontier: true, frontierBranchId: "B1" };
const world = {
  worldVersion: "test",
  scenes: [{ id: "S1", paths: [path, secondPath] }],
};
const frontiers = { frontiers: [
  { branch_id: "B1", current_scene_id: "S1", path_id: "S1-P1", depth: 4 },
  { branch_id: "B1", current_scene_id: "S1", path_id: "S1-P2", depth: 4 },
] };
const confirmed = {
  scenes: [{ sceneId: "S1", annotationStatus: "masks-confirmed", observedVisibleRouteCount: 1, masks: [{ sourcePathId: "S1-P1" }] }],
};

test("classifyFrontiers requires a matching human-confirmed mask", () => {
  assert.equal(classifyFrontiers(world, frontiers, { scenes: [] }).blocked[0].reason, "awaiting-human-annotation");
  assert.equal(classifyFrontiers(world, frontiers, confirmed).ready[0].path_id, "S1-P1");
});

test("classifyFrontiers blocks four-plus scenes without a rarity approval", () => {
  const annotations = { scenes: [{ ...confirmed.scenes[0], observedVisibleRouteCount: 4 }] };
  assert.equal(classifyFrontiers(world, frontiers, annotations).blocked[0].reason, "requires-four-plus-approval");
  assert.equal(classifyFrontiers(world, frontiers, annotations, { fourPlusApprovedSceneIds: ["S1"] }).ready.length, 1);
});

test("classifyFrontiers reserves source paths already consumed by active candidates", () => {
  const result = classifyFrontiers(world, frontiers, confirmed, { reservedSourcePathIds: ["S1-P1"] });
  assert.equal(result.ready.length, 0);
  assert.equal(result.blocked.find((frontier) => frontier.path_id === "S1-P1").reason, "active-candidate");
});

test("deriveCandidateStatus follows the staging annotation", () => {
  const candidate = { id: "S2" };
  assert.equal(deriveCandidateStatus(candidate, { scenes: [] }), "awaiting-route-annotation");
  assert.equal(deriveCandidateStatus(candidate, { scenes: [{ sceneId: "S2", annotationStatus: "staging-awaiting-approval" }] }), "awaiting-review-approval");
  assert.equal(deriveCandidateStatus(candidate, { scenes: [{ sceneId: "S2", annotationStatus: "staging-masks-confirmed" }] }), "ready-for-promotion");
});

test("validateProductionQueue accepts multiple independent staged candidates", () => {
  const queue = {
    worldVersion: "test",
    batch: { id: "BATCH", strategy: "depth-first-human-gated", targetSceneCount: 5 },
    completedSceneIds: [],
    candidates: [{
      id: "S2",
      sourceSceneId: "S1",
      sourcePathId: "S1-P1",
      branchId: "B1",
      status: "awaiting-route-annotation",
      image: "/S2.png",
      asset: { width: 1448, height: 1086 },
      generatorOutput: "output.png",
      promptRecord: "docs/prompts#s2",
    }, {
      id: "S3",
      sourceSceneId: "S1",
      sourcePathId: "S1-P2",
      branchId: "B1",
      status: "awaiting-route-annotation",
      image: "/S3.png",
      asset: { width: 1448, height: 1086 },
      generatorOutput: "output-2.png",
      promptRecord: "docs/prompts#s3",
    }],
  };
  assert.deepEqual(validateProductionQueue(world, frontiers, { scenes: [] }, queue), []);
});
