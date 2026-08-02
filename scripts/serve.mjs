import { createReadStream } from "node:fs";
import { readFile, rename, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const sceneRegistryPath = path.resolve(root, "public", "scenes", "scenes.json");
const annotationPath = path.resolve(root, "public", "scenes", "manual-route-annotations.json");
const stagingScenePath = path.resolve(root, "public", "scenes", "staging-scenes.json");
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
]);

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("Editor payload is too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sanitizeMasks(rawMasks, scene) {
  if (!Array.isArray(rawMasks) || rawMasks.length < 1 || rawMasks.length > 32) {
    throw new Error("A scene must contain between 1 and 32 route masks");
  }
  const ids = new Set();
  const sourceIds = new Set(scene.paths.map((entry) => entry.id));
  return rawMasks.map((mask) => {
    if (!mask?.id || typeof mask.id !== "string" || ids.has(mask.id)) throw new Error("Route mask ids must be unique strings");
    ids.add(mask.id);
    const sourcePathId = mask.sourcePathId || null;
    if (sourcePathId && !sourceIds.has(sourcePathId)) throw new Error(`Unknown source path ${sourcePathId}`);
    const regions = {};
    for (const viewport of ["desktop", "mobile"]) {
      const points = mask.regions?.[viewport];
      if (!Array.isArray(points) || points.length < 3 || points.length > 64) throw new Error(`${mask.id} has an invalid ${viewport} polygon`);
      regions[viewport] = points.map((point) => {
        if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) throw new Error(`${mask.id} contains an invalid point`);
        const [x, y] = point;
        if (x < 0 || y < 0 || x > scene.asset.width || y > scene.asset.height) throw new Error(`${mask.id} contains a point outside the image`);
        return [Math.round(x), Math.round(y)];
      });
    }
    return { id: mask.id, sourcePathId, status: sourcePathId ? mask.status : "draft", regions };
  });
}

async function atomicJsonWrite(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

async function saveEditorScene(request, response) {
  try {
    const payload = await readJsonBody(request);
    const world = JSON.parse(await readFile(sceneRegistryPath, "utf8"));
    if (payload.worldVersion !== world.worldVersion) throw new Error("The editor draft belongs to another world version");
    let staging = null;
    let scene = world.scenes.find((candidate) => candidate.id === payload.sceneId);
    let isStaging = false;
    if (!scene) {
      staging = JSON.parse(await readFile(stagingScenePath, "utf8"));
      scene = staging.candidates?.find((candidate) => candidate.id === payload.sceneId);
      isStaging = Boolean(scene);
    }
    if (!scene) throw new Error(`Unknown scene ${payload.sceneId}`);
    const masks = sanitizeMasks(payload.masks, scene);

    let annotations = { worldVersion: world.worldVersion, updatedAt: null, scenes: [] };
    try {
      annotations = JSON.parse(await readFile(annotationPath, "utf8"));
    } catch {
      // The first editor save creates the annotation registry.
    }
    if (annotations.worldVersion !== world.worldVersion || !Array.isArray(annotations.scenes)) {
      annotations = { worldVersion: world.worldVersion, updatedAt: null, scenes: [] };
    }
    const annotatedSourceIds = new Set(masks.map((mask) => mask.sourcePathId).filter(Boolean));
    const hasNewRoutes = masks.some((mask) => !mask.sourcePathId);
    const hasRemovedRoutes = scene.paths.some((pathEntry) => !annotatedSourceIds.has(pathEntry.id));
    const record = {
      sceneId: scene.id,
      image: scene.image,
      observedVisibleRouteCount: masks.length,
      annotationStatus: isStaging
        ? "staging-masks-confirmed"
        : hasNewRoutes
          ? "needs-route-registration"
          : hasRemovedRoutes
            ? "needs-route-reconciliation"
            : "masks-confirmed",
      masks,
    };
    const existingIndex = annotations.scenes.findIndex((entry) => entry.sceneId === scene.id);
    if (existingIndex >= 0) annotations.scenes[existingIndex] = record;
    else annotations.scenes.push(record);
    annotations.scenes.sort((first, second) => first.sceneId.localeCompare(second.sceneId));
    annotations.updatedAt = new Date().toISOString();

    await atomicJsonWrite(annotationPath, annotations);
    if (isStaging) {
      const candidate = staging.candidates.find((entry) => entry.id === scene.id);
      candidate.status = "ready-for-promotion";
      candidate.reviewStatus = "route-annotation-complete";
      candidate.observedVisibleRouteCount = masks.length;
      staging.updatedAt = new Date().toISOString();
      await atomicJsonWrite(stagingScenePath, staging);
    }
    sendJson(response, 200, { ok: true, sceneId: scene.id, routeCount: masks.length, annotationStatus: record.annotationStatus });
  } catch (error) {
    sendJson(response, 400, { ok: false, error: error.message });
  }
}

http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === "/__dev/editor/save" && request.method === "POST") {
    await saveEditorScene(request, response);
    return;
  }

  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = requested.startsWith("/scenes/") || requested.startsWith("/boundary/")
    ? path.resolve(root, "public", `.${requested}`)
    : path.resolve(root, `.${requested}`);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, { "Content-Type": mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream" });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, "127.0.0.1", () => console.log(`Backrooms slice: http://127.0.0.1:${port}`));
