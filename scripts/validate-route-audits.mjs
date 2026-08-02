import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateRouteAuditRegistry } from "../src/route-audit-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requirePass = process.argv.includes("--release");
const world = JSON.parse(await readFile(path.join(root, "public/scenes/scenes.json"), "utf8"));
const generationJobs = JSON.parse(await readFile(path.join(root, "production/generation-jobs.json"), "utf8"));
const routeAuditCases = JSON.parse(await readFile(path.join(root, "production/route-audit-cases.json"), "utf8"));
let registry;
try {
  registry = JSON.parse(await readFile(path.join(root, "production/route-audits.json"), "utf8"));
} catch {
  console.error("Route audit results are missing. Run `npm run audit:regressions` or `npm run audit:batch` first.");
  process.exit(1);
}

const requiredSceneIds = requirePass
  ? [
      ...generationJobs.jobs.map((job) => job.sceneId),
      ...routeAuditCases.cases.map((fixture) => fixture.sceneId)
    ]
  : [];
const expectedRouteCounts = new Map(
  routeAuditCases.cases.map((fixture) => [fixture.sceneId, fixture.expectedVisibleRouteCount])
);
const errors = validateRouteAuditRegistry(world, registry, { requirePass, requiredSceneIds, expectedRouteCounts });
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${registry.audits.length} two-pass route audits${requirePass ? " for release" : ""}.`);
}
