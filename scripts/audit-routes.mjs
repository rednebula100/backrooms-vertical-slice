import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROUTE_AUDIT_SCHEMA_VERSION,
  normalizeAuditPass,
  reconcileAuditPasses,
  routeMaskFingerprint,
  routeAuditOutputSchema
} from "../src/route-audit-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function option(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function options(name) {
  return args.flatMap((argument, index) => argument === name ? [args[index + 1]] : []).filter(Boolean);
}

const caseFile = path.resolve(root, option("--cases", "production/route-audit-cases.json"));
const outputFile = path.resolve(root, option("--output", "production/route-audits.json"));
const requestedSceneIds = options("--scene");
const auditBatch = args.includes("--batch");
const assertExpected = args.includes("--assert-expected");
const model = option("--model", process.env.ROUTE_AUDIT_MODEL || "gpt-5.6-terra");
const adjudicatorModel = option("--adjudicator-model", process.env.ROUTE_AUDIT_ADJUDICATOR_MODEL || "gpt-5.6-sol");
const codexEntry = path.join(root, "node_modules", "@openai", "codex", "bin", "codex.js");
const sceneConcurrency = Number(option("--concurrency", "2"));
const auditTimeoutSeconds = Number(option("--timeout-seconds", "300"));

if (!Number.isInteger(sceneConcurrency) || sceneConcurrency < 1 || sceneConcurrency > 8) {
  console.error("--concurrency must be an integer from 1 to 8");
  process.exit(2);
}
if (!Number.isFinite(auditTimeoutSeconds) || auditTimeoutSeconds < 30 || auditTimeoutSeconds > 1800) {
  console.error("--timeout-seconds must be from 30 to 1800");
  process.exit(2);
}

const world = JSON.parse(await readFile(path.join(root, "public/scenes/scenes.json"), "utf8"));
const batch = JSON.parse(await readFile(path.join(root, "production/generation-jobs.json"), "utf8"));
const fixtures = JSON.parse(await readFile(caseFile, "utf8"));
const scenes = new Map(world.scenes.map((scene) => [scene.id, scene]));
const fixtureByScene = new Map(fixtures.cases.map((item) => [item.sceneId, item]));
const jobByScene = new Map(batch.jobs.map((job) => [job.sceneId, job]));
const selectedIds = requestedSceneIds.length
  ? requestedSceneIds
  : auditBatch
    ? batch.jobs.map((job) => job.sceneId)
    : fixtures.cases.map((item) => item.sceneId);

const sharedInstructions = `You audit AI-generated Backrooms exploration images for every visually distinct passage-like click target visible from the current camera viewpoint. The goal is visual interaction coverage, not reconstruction of the building's true hidden topology.

A route is any visually separated carpet channel, opening, or exposed wall-edge continuation that a player could reasonably try to click. Count routes around both sides of freestanding or staggered wall masses, including narrow, partially occluded, and AI-ambiguous carpet channels. If a wall mass can plausibly be passed on its left and right, those are separate routes even when one side is less visible. Count an implied continuation when the floor/ceiling geometry and exposed wall edge make it plausible that space continues behind the obstruction.

Apply this deterministic wall-ladder rule whenever the image contains successive offset full-height wall or partition masses. Exclude the near side wall that continuously frames the camera and touches the left or right image boundary; it is the boundary of the current corridor, not a staggered mass. Beyond that boundary, count every distinct offset mass with an exposed vertical edge. Treat adjacent front and side faces belonging to the same wall thickness as one mass. For N staggered masses, create N+1 candidate passage slots: one outside the leftmost mass, one between every adjacent pair, and one outside the rightmost mass. Keep each slot as a separate clear, partial, or implied click target unless a continuous joined wall and uninterrupted baseboard visibly seal that exact slot. Carpet need not be fully exposed when the vertical edge and perspective plausibly hide it. Do not collapse these slots because they might reconnect behind walls. Do not count only the foreground approach as another route, and do not count floor lying only in front of a flat terminating wall.

For each route, return a normalized 0..1000 bounding rectangle over the architectural entry or wall edge that a player would click. Set ambiguity when the generated geometry does not permit a confident topology judgment. Do not use any existing UI overlay, scene metadata, expected count, or route mask as evidence.`;

const auditorPrompts = [
  "Enumerate the scene topology from left to right. Inspect both sides of every wall mass before counting routes.",
  "Act as a skeptical omission hunter. Trace every plausible carpet channel from the camera, especially routes hidden or implied around staggered partitions."
];

function terminateProcessTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true
      });
      return;
    } catch {}
  }
  child.kill("SIGTERM");
}

function runCodex(args, prompt, { cwd, env, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const maxBuffer = 10 * 1024 * 1024;

    const finish = (error = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    };
    const stopForBuffer = () => {
      terminateProcessTree(child);
      finish(new Error("Codex CLI output exceeded the 10 MB safety limit"));
    };
    const timer = setTimeout(() => {
      terminateProcessTree(child);
      finish(new Error(`Codex CLI route audit timed out after ${Math.round(timeoutMs / 1000)} seconds`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > maxBuffer) stopForBuffer();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > maxBuffer) stopForBuffer();
    });
    child.on("error", (error) => finish(error));
    child.on("close", (code, signal) => {
      if (code === 0) finish();
      else finish(new Error(`Codex CLI exited with code ${code ?? "unknown"}${signal ? ` (${signal})` : ""}`));
    });
    child.stdin.on("error", (error) => {
      if (error.code !== "EPIPE") finish(error);
    });
    child.stdin.end(prompt, "utf8");
  });
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function requestAudit(imagePath, prompt, requestModel = model) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "backrooms-route-audit-"));
  const schemaPath = path.join(tempDir, "output-schema.json");
  const outputPath = path.join(tempDir, "result.json");
  const childEnv = { ...process.env, NODE_USE_SYSTEM_CA: process.env.NODE_USE_SYSTEM_CA || "1" };
  delete childEnv.OPENAI_API_KEY;
  delete childEnv.CODEX_API_KEY;

  try {
    await writeFile(schemaPath, `${JSON.stringify(routeAuditOutputSchema, null, 2)}\n`, "utf8");
    const fullPrompt = `${sharedInstructions}\n\nIndependent auditor instruction: ${prompt}\n\nReturn only the JSON object required by the supplied output schema. Do not inspect the filesystem or call tools.`;
    await runCodex([
      codexEntry,
      "exec",
      "--model", requestModel,
      "--config", "model_reasoning_effort=\"low\"",
      "--sandbox", "read-only",
      "--cd", tempDir,
      "--skip-git-repo-check",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--color", "never",
      "--image", imagePath,
      "--output-schema", schemaPath,
      "--output-last-message", outputPath,
      "-"
    ], fullPrompt, {
      cwd: tempDir,
      env: childEnv,
      timeoutMs: auditTimeoutSeconds * 1000
    });
    return {
      responseId: null,
      responseModel: requestModel,
      usage: null,
      value: JSON.parse(await readFile(outputPath, "utf8"))
    };
  } catch (error) {
    const detail = error.stderr?.trim() || error.stdout?.trim() || error.message;
    throw new Error(`Codex CLI route audit failed: ${detail}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function auditScene(sceneId) {
  const scene = scenes.get(sceneId);
  if (!scene) throw new Error(`Unknown scene: ${sceneId}`);
  const imagePath = path.join(root, "public", scene.image.replace(/^\//, ""));
  const fixture = fixtureByScene.get(sceneId);
  const job = jobByScene.get(sceneId);
  const calls = await Promise.all(auditorPrompts.map(async (prompt, index) => {
    const result = await requestAudit(imagePath, prompt);
    console.log(`  ${sceneId} auditor ${index + 1}/2 complete`);
    return result;
  }));
  const passes = calls.map((call, index) => ({
    ...normalizeAuditPass(call.value, `independent-${index + 1}`),
    backend: "codex-cli-chatgpt",
    responseId: call.responseId,
    responseModel: call.responseModel,
    usage: call.usage
  }));
  const preliminaryCounts = passes.map((pass) => pass.routeCount);
  const scoutsAgree = new Set(preliminaryCounts).size === 1;
  const needsAdjudication = !scoutsAgree
    || (preliminaryCounts[0] === 1 && passes.some((pass) => pass.ambiguity));
  let adjudication = null;
  if (needsAdjudication) {
    const candidateReports = calls.map((call, index) => ({
      scout: index + 1,
      report: call.value
    }));
    const adjudicationPrompt = `Act as the final visual-interaction adjudicator. Re-inspect the attached image and reconcile the two independent scout reports below. Each scout may have omitted a different click target. Return the union of visually distinct passage-like channels, openings, and exposed wall-edge continuations. Apply the wall-ladder rule mechanically. Exclude a near side wall that continuously frames the camera and touches an image boundary. Beyond it, count each successive offset full-height wall mass with an exposed vertical edge, merging front and side faces of the same wall thickness. For N staggered masses create N+1 slots consisting of the left outer side, every space between adjacent masses, and the right outer side. Keep even partially occluded or implied slots unless a continuous joined wall and uninterrupted baseboard clearly seal that exact slot. Do not merge slots because they may reconnect behind walls. Do not average scout counts or prefer higher confidence. Remove only duplicate reports aimed at the same slot. The expected regression count, registered masks, and generation target are intentionally not provided.\n\nScout reports:\n${JSON.stringify(candidateReports, null, 2)}`;
    const call = await requestAudit(imagePath, adjudicationPrompt, adjudicatorModel);
    adjudication = {
      ...normalizeAuditPass(call.value, "adjudicator"),
      backend: "codex-cli-chatgpt",
      responseId: call.responseId,
      responseModel: call.responseModel,
      usage: call.usage
    };
    console.log(`  ${sceneId} adjudicator complete (${preliminaryCounts.join("/")} -> ${adjudication.routeCount})`);
  }
  const comparison = reconcileAuditPasses(passes, {
    registeredRouteCount: scene.paths.length,
    desiredRouteCount: job?.desiredVisibleRouteCount ?? null,
    expectedRouteCount: fixture?.expectedVisibleRouteCount ?? null,
    rareRouteApproved: fixture?.rareRouteApproved === true,
    humanTopologyApproved: fixture?.humanTopologyApproved === true,
    adjudicationPass: adjudication
  });
  return {
    sceneId,
    image: scene.image,
    pathFingerprint: routeMaskFingerprint(scene),
    expectedReason: fixture?.reason ?? null,
    passes,
    adjudication,
    comparison
  };
}

let audits = [];
try {
  audits = await mapWithConcurrency(selectedIds, sceneConcurrency, async (sceneId) => {
    console.log(`Auditing ${sceneId} with ${model} (2 passes in parallel)...`);
    const audit = await auditScene(sceneId);
    console.log(`${audit.passes.map((pass) => pass.routeCount).join("/")} -> ${audit.comparison.status}`);
    return audit;
  });
} catch (error) {
  console.error(`\n${error.message}`);
  process.exit(1);
}

let existing = null;
try {
  existing = JSON.parse(await readFile(outputFile, "utf8"));
} catch {}
const selected = new Set(selectedIds);
const mergedAudits = [
  ...(existing?.audits ?? []).filter((audit) => !selected.has(audit.sceneId)),
  ...audits
].sort((left, right) => left.sceneId.localeCompare(right.sceneId));
const registry = {
  schemaVersion: ROUTE_AUDIT_SCHEMA_VERSION,
  worldVersion: world.worldVersion,
  backend: "codex-cli-chatgpt",
  model,
  adjudicatorModel,
  imageInput: "native-file",
  generatedAt: new Date().toISOString(),
  audits: mergedAudits
};
await writeFile(outputFile, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
console.log(`Wrote ${path.relative(root, outputFile)} with ${mergedAudits.length} scene audits.`);

if (assertExpected) {
  const failures = audits.filter((audit) => audit.comparison.blockingReasons.includes("regression-count-mismatch"));
  if (failures.length) {
    console.error(`Regression count mismatch: ${failures.map((audit) => audit.sceneId).join(", ")}`);
    process.exitCode = 1;
  }
}
