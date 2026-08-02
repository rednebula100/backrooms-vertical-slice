import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateRouteReviews } from "../src/scene-model.mjs";
import { validateRouteAuditRegistry } from "../src/route-audit-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const world = JSON.parse(await readFile(path.join(root, "public", "scenes", "scenes.json"), "utf8"));
const routeReviews = JSON.parse(await readFile(path.join(root, "public", "scenes", "route-reviews.json"), "utf8"));
const generationJobs = JSON.parse(await readFile(path.join(root, "production", "generation-jobs.json"), "utf8"));
const routeAuditCases = JSON.parse(await readFile(path.join(root, "production", "route-audit-cases.json"), "utf8"));
const requiredAuditSceneIds = [
  ...generationJobs.jobs.map((job) => job.sceneId),
  ...routeAuditCases.cases.map((fixture) => fixture.sceneId)
];
const expectedRouteCounts = new Map(
  routeAuditCases.cases.map((fixture) => [fixture.sceneId, fixture.expectedVisibleRouteCount])
);
const errors = validateRouteReviews(world, routeReviews, { requirePlaytestPass: true });
try {
  const routeAudits = JSON.parse(await readFile(path.join(root, "production", "route-audits.json"), "utf8"));
  errors.push(...validateRouteAuditRegistry(world, routeAudits, {
    requirePass: true,
    requiredSceneIds: requiredAuditSceneIds,
    expectedRouteCounts
  }));
} catch {
  errors.push("Release blocked until the required two-pass route audits have run");
}

if (errors.length) {
  console.error(["Release blocked until visual route audits and user playtesting pass.", ...errors].join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Release gate passed for ${routeReviews.scenes.length} reviewed pilot scenes.`);
}
