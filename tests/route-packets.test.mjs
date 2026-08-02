import assert from "node:assert/strict";
import test from "node:test";
import { buildRoutePacketRegistry, validateRoutePacketRegistry } from "../src/route-packets.mjs";

const regions = {
  desktop: [[10, 10], [60, 10], [60, 90], [10, 90]],
  mobile: [[10, 10], [60, 10], [60, 90], [10, 90]],
};
const path = (id) => ({ id, status: "pending", movementType: "DIRECT" });
const world = {
  worldVersion: "test",
  scenes: [{ id: "S1", image: "/S1.png", asset: { width: 200, height: 150 }, paths: [path("S1-P1"), path("S1-P2")] }],
};
const annotations = {
  scenes: [{
    sceneId: "S1",
    annotationStatus: "masks-confirmed",
    masks: [
      { sourcePathId: "S1-P1", regions },
      { sourcePathId: "S1-P2", regions: { desktop: regions.desktop.map(([x, y]) => [x + 100, y]), mobile: regions.mobile } },
    ],
  }],
};
const overrides = {
  scenes: {
    S1: {
      sourceSpaceId: "SP-S1",
      paths: {
        "S1-P1": {
          targetSceneId: "S2",
          targetSpaceId: "SP-S2",
          transitionRelation: "adjacent-space",
          cameraTransition: { instruction: "walk through", distanceMeters: 4, targetView: "past the opening" },
          continuityAnchors: ["wall", "floor", "light"],
          spatialBrief: { intensity: "subtle", archetype: "offset-room", instruction: "change one feature" },
        },
        "S1-P2": {
          targetSceneId: "S3",
          targetSpaceId: "SP-S1",
          transitionRelation: "same-space-advance",
          cameraTransition: { instruction: "walk around", distanceMeters: 3, targetView: "past the wall" },
          continuityAnchors: ["wall", "floor", "light"],
          spatialBrief: { intensity: "subtle", archetype: "wide-bend", instruction: "retain the room" },
        },
      },
    },
  },
};

test("route packets bind each branch to a distinct visual and camera contract", () => {
  const registry = buildRoutePacketRegistry(world, annotations, overrides, { updatedAt: "now" });
  assert.equal(registry.packets.length, 2);
  assert.deepEqual(registry.packets.map((packet) => packet.screenRole), ["leftmost", "rightmost"]);
  assert.deepEqual(registry.packets[0].forbiddenSourcePathIds, ["S1-P2"]);
  assert.equal(registry.packets[1].sourceSpaceId, registry.packets[1].targetSpaceId);
  assert.match(registry.packets[0].prompt, /Follow only S1-P1/);
  assert.deepEqual(validateRoutePacketRegistry(world, annotations, registry), []);
});

test("route packets become consumed provenance after their target is promoted", () => {
  const promotedWorld = structuredClone(world);
  promotedWorld.scenes[0].paths[0] = {
    ...promotedWorld.scenes[0].paths[0],
    status: "active",
    targetSceneId: "S2",
  };
  promotedWorld.scenes.push({ id: "S2", sourceSceneId: "S1", sourcePathId: "S1-P1", paths: [] });
  const registry = buildRoutePacketRegistry(promotedWorld, annotations, overrides, { updatedAt: "later" });
  assert.equal(registry.packets.find((packet) => packet.sourcePathId === "S1-P1").generationStatus, "consumed");
  assert.equal(registry.packets.find((packet) => packet.sourcePathId === "S1-P2").generationStatus, "ready");
  assert.deepEqual(validateRoutePacketRegistry(promotedWorld, annotations, registry), []);
});
