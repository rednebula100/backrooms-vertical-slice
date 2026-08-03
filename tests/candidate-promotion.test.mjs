import assert from "node:assert/strict";
import test from "node:test";
import { promoteReviewedCandidates } from "../src/candidate-promotion.mjs";

const regions = {
  desktop: [[40, 30], [160, 30], [160, 180], [40, 180]],
  mobile: [[40, 30], [160, 30], [160, 180], [40, 180]],
};

function scene(id, paths) {
  return {
    id,
    levelId: "LV-000",
    branchId: "BR-ROOT",
    status: "provisional-frontier",
    approvalStatus: "provisional-generated",
    reviewStatus: "needs-route-playtest",
    accessibleName: "a test scene",
    description: "test",
    continuityAnchors: ["wallpaper"],
    recentChanges: [],
    image: `/${id}.png`,
    asset: { width: 320, height: 240, aspectRatio: "4:3" },
    camera: {},
    state: { openness: 0.3 },
    paths,
  };
}

function pendingPath(id) {
  return {
    id,
    status: "pending",
    frontier: true,
    frontierBranchId: "BR-ROOT",
    accessibleName: "continue",
    semanticDescription: "continue",
    screenLocation: "center",
    physicalForm: "passage",
    movementDirection: "forward",
    movementType: "DIRECT",
    targetSceneId: null,
    targetCamera: null,
    continuityAnchors: ["wallpaper"],
    regions,
  };
}

test("promotion registers full-snapshot routes and makes reviewed candidates playable", () => {
  const world = {
    worldVersion: "test",
    startSceneId: "S1",
    scenes: [scene("S1", [pendingPath("S1-P1")])],
  };
  const candidate = {
    ...scene("S2", []),
    branchId: "BR-ROOT",
    staging: true,
    status: "ready-for-promotion",
    sourceSceneId: "S1",
    sourcePathId: "S1-P1",
    accessibleName: "an unreviewed test candidate",
  };
  const annotations = {
    worldVersion: "test",
    scenes: [
      {
        sceneId: "S1",
        image: "/S1.png",
        observedVisibleRouteCount: 2,
        annotationStatus: "needs-route-registration",
        reviewComplete: true,
        masks: [
          { id: "S1-P1", sourcePathId: "S1-P1", status: "pending", regions },
          { id: "MASK-S1-01", sourcePathId: null, status: "draft", regions },
        ],
      },
      {
        sceneId: "S2",
        image: "/S2.png",
        observedVisibleRouteCount: 1,
        annotationStatus: "staging-masks-confirmed",
        reviewComplete: true,
        masks: [{ id: "MASK-S2-01", sourcePathId: null, status: "draft", regions }],
      },
    ],
  };
  const result = promoteReviewedCandidates({
    world,
    registry: { world_version: "test", frontiers: [] },
    annotations,
    queue: {
      worldVersion: "test",
      batch: { targetSceneCount: 20, fourPlusApprovedSceneIds: [] },
      completedSceneIds: [],
      candidates: [candidate],
    },
    routeReviews: { worldVersion: "test", scenes: [] },
    now: "2026-08-03T00:00:00.000Z",
  });

  assert.deepEqual(result.promotedSceneIds, ["S2"]);
  assert.equal(result.queue.candidates.length, 0);
  assert.deepEqual(result.queue.completedSceneIds, ["S2"]);
  assert.equal(result.world.scenes.length, 2);
  assert.equal(result.world.scenes[0].paths[0].status, "active");
  assert.equal(result.world.scenes[0].paths[0].targetSceneId, "S2");
  assert.equal(result.world.scenes[0].paths[1].id, "S1-P2");
  assert.equal(result.world.scenes[1].paths[0].id, "S2-P1");
  assert.deepEqual(result.registry.frontiers.map((frontier) => frontier.path_id).sort(), ["S1-P2", "S2-P1"]);
  assert.equal(result.annotations.scenes[0].annotationStatus, "masks-confirmed");
  assert.equal(result.annotations.scenes[1].annotationStatus, "masks-confirmed");
  assert.equal(result.routeReviews.scenes[0].playtestStatus, "pass");
});

test("promotion can preserve a reviewed pilot as a staged candidate", () => {
  const world = {
    worldVersion: "test",
    startSceneId: "S1",
    scenes: [scene("S1", [pendingPath("S1-P1")])],
  };
  const candidate = {
    ...scene("S2", []),
    staging: true,
    status: "ready-for-promotion",
    sourceSceneId: "S1",
    sourcePathId: "S1-P1",
  };
  const annotations = {
    worldVersion: "test",
    scenes: [
      {
        sceneId: "S1",
        image: "/S1.png",
        observedVisibleRouteCount: 1,
        annotationStatus: "masks-confirmed",
        reviewComplete: true,
        masks: [{ id: "S1-P1", sourcePathId: "S1-P1", status: "pending", regions }],
      },
      {
        sceneId: "S2",
        image: "/S2.png",
        observedVisibleRouteCount: 1,
        annotationStatus: "staging-masks-confirmed",
        reviewComplete: true,
        masks: [{ id: "MASK-S2-01", sourcePathId: null, status: "draft", regions }],
      },
    ],
  };
  const queue = {
    worldVersion: "test",
    batch: { targetSceneCount: 5, fourPlusApprovedSceneIds: [] },
    completedSceneIds: [],
    candidates: [candidate],
  };
  const result = promoteReviewedCandidates({
    world,
    registry: { world_version: "test", frontiers: [] },
    annotations,
    queue,
    routeReviews: { worldVersion: "test", scenes: [] },
    now: "2026-08-04T00:00:00.000Z",
    promoteCandidates: false,
  });

  assert.deepEqual(result.promotedSceneIds, []);
  assert.equal(result.world.scenes.some((scene) => scene.id === "S2"), false);
  assert.equal(result.queue.candidates.some((candidate) => candidate.id === "S2"), true);
  assert.equal(result.world.scenes[0].paths[0].status, "pending");
  assert.equal(result.queue.candidates[0].paths[0].id, "S2-P1");
  assert.equal(result.annotations.scenes[1].masks[0].sourcePathId, "S2-P1");
});
