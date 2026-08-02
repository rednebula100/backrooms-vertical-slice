import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  normalizeAuditPass,
  reconcileAuditPasses,
  routeMaskFingerprint,
  validateRouteAuditRegistry
} from "../src/route-audit-model.mjs";

function rawPass(routeCount, { ambiguity = false, confidence = 0.9 } = {}) {
  return {
    route_count: routeCount,
    ambiguity,
    ambiguity_reason: ambiguity ? "uncertain wall connection" : "",
    scene_summary: "fixture",
    routes: Array.from({ length: routeCount }, (_, index) => ({
      route_id: `R${index + 1}`,
      description: `route ${index + 1}`,
      evidence: "continuous carpet around a wall edge",
      visibility: "clear",
      confidence,
      entry_region: { left: index * 100, top: 200, right: index * 100 + 80, bottom: 700 }
    }))
  };
}

test("two agreeing route auditors produce a consensus", () => {
  const passes = [
    normalizeAuditPass(rawPass(3), "a"),
    normalizeAuditPass(rawPass(3), "b")
  ];
  assert.deepEqual(reconcileAuditPasses(passes, {
    registeredRouteCount: 3,
    desiredRouteCount: 3,
    expectedRouteCount: 3
  }), {
    status: "pass",
    auditorsAgree: true,
    adjudicated: false,
    preliminaryRouteCounts: [3, 3],
    consensusRouteCount: 3,
    registeredRouteCount: 3,
    desiredRouteCount: 3,
    expectedRouteCount: 3,
    rareRouteApproved: false,
    humanTopologyApproved: false,
    blockingReasons: []
  });
});

test("auditor disagreement and low confidence block automatic acceptance", () => {
  const passes = [
    normalizeAuditPass(rawPass(2, { confidence: 0.5 }), "a"),
    normalizeAuditPass(rawPass(3), "b")
  ];
  const result = reconcileAuditPasses(passes, { registeredRouteCount: 1 });
  assert.equal(result.status, "blocked");
  assert.equal(result.consensusRouteCount, null);
  assert.ok(result.blockingReasons.includes("auditors-disagree"));
  assert.ok(result.blockingReasons.includes("low-confidence-audit"));
});

test("a final adjudicator can union different routes omitted by ambiguous scouts", () => {
  const passes = [
    normalizeAuditPass(rawPass(1, { ambiguity: true, confidence: 0.7 }), "a"),
    normalizeAuditPass(rawPass(1, { ambiguity: true, confidence: 0.8 }), "b")
  ];
  const adjudicationPass = normalizeAuditPass(rawPass(2, { confidence: 0.9 }), "adjudicator");
  const result = reconcileAuditPasses(passes, {
    registeredRouteCount: 1,
    expectedRouteCount: 2,
    adjudicationPass
  });
  assert.equal(result.adjudicated, true);
  assert.equal(result.consensusRouteCount, 2);
  assert.deepEqual(result.preliminaryRouteCounts, [1, 1]);
  assert.deepEqual(result.blockingReasons, ["registered-route-count-mismatch"]);
});

test("unregistered detected routes block the scene", () => {
  const passes = [
    normalizeAuditPass(rawPass(2), "a"),
    normalizeAuditPass(rawPass(2), "b")
  ];
  const result = reconcileAuditPasses(passes, { registeredRouteCount: 1 });
  assert.deepEqual(result.blockingReasons, ["registered-route-count-mismatch"]);
});

test("four or more routes always enter the rare-route review gate", () => {
  const passes = [
    normalizeAuditPass(rawPass(4), "a"),
    normalizeAuditPass(rawPass(4), "b")
  ];
  const result = reconcileAuditPasses(passes, {
    registeredRouteCount: 4,
    desiredRouteCount: 4,
    expectedRouteCount: 4
  });
  assert.deepEqual(result.blockingReasons, ["four-plus-route-review"]);
});

test("an explicit human regression approval clears only the four-plus review gate", () => {
  const passes = [
    normalizeAuditPass(rawPass(4), "a"),
    normalizeAuditPass(rawPass(4), "b")
  ];
  const result = reconcileAuditPasses(passes, {
    registeredRouteCount: 4,
    expectedRouteCount: 4,
    rareRouteApproved: true
  });
  assert.equal(result.status, "pass");
  assert.deepEqual(result.blockingReasons, []);
});

test("a human-confirmed topology overrides model ambiguity only when masks match the confirmed count", () => {
  const passes = [
    normalizeAuditPass(rawPass(3, { ambiguity: true }), "a"),
    normalizeAuditPass(rawPass(3, { ambiguity: true }), "b")
  ];
  const approved = reconcileAuditPasses(passes, {
    registeredRouteCount: 2,
    expectedRouteCount: 2,
    humanTopologyApproved: true
  });
  assert.equal(approved.status, "pass");
  assert.deepEqual(approved.blockingReasons, []);

  const staleMasks = reconcileAuditPasses(passes, {
    registeredRouteCount: 1,
    expectedRouteCount: 2,
    humanTopologyApproved: true
  });
  assert.equal(staleMasks.status, "blocked");
});

test("a confirmed sub-four topology clears a false model four-plus classification", () => {
  const passes = [normalizeAuditPass(rawPass(4), "a"), normalizeAuditPass(rawPass(4), "b")];
  const result = reconcileAuditPasses(passes, {
    registeredRouteCount: 3,
    expectedRouteCount: 3,
    humanTopologyApproved: true
  });
  assert.equal(result.status, "pass");
  assert.deepEqual(result.blockingReasons, []);
});

test("route-audit registry validation detects stale masks and release blockers", () => {
  const world = {
    worldVersion: "test",
    scenes: [{ id: "S1", image: "/s1.png", paths: [{ id: "P1" }] }]
  };
  const registry = {
    schemaVersion: 1,
    worldVersion: "test",
    audits: [{
      sceneId: "S1",
      image: "/s1.png",
      pathFingerprint: routeMaskFingerprint(world.scenes[0]),
      passes: [{}, {}],
      comparison: {
        status: "blocked",
        registeredRouteCount: 1,
        blockingReasons: ["registered-route-count-mismatch"]
      }
    }]
  };
  assert.deepEqual(validateRouteAuditRegistry(world, registry), []);
  assert.equal(validateRouteAuditRegistry(world, registry, { requirePass: true }).length, 1);
  assert.deepEqual(
    validateRouteAuditRegistry(world, registry, { requiredSceneIds: ["S1", "S2"] }),
    ["Required scene S2 has no route audit"]
  );
});

test("human-confirmed B-branch regressions preserve the known 2/3/2 route counts", async () => {
  const world = JSON.parse(await readFile(new URL("../public/scenes/scenes.json", import.meta.url), "utf8"));
  const fixtures = JSON.parse(await readFile(new URL("../production/route-audit-cases.json", import.meta.url), "utf8"));
  const scenes = new Map(world.scenes.map((scene) => [scene.id, scene]));

  assert.deepEqual(
    fixtures.cases.map((fixture) => fixture.expectedVisibleRouteCount),
    [2, 3, 2]
  );
  assert.ok(fixtures.cases.every((fixture) => fixture.humanTopologyApproved === true));
  assert.deepEqual(
    fixtures.cases.map((fixture) => scenes.get(fixture.sceneId)?.paths.length),
    [2, 3, 2],
    "Every human-confirmed visible B-branch route must have a registered mask."
  );
});
