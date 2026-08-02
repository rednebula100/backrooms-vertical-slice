import {
  SAVE_KEY,
  indexScenes,
  makeSavePayload,
  reachableImages,
  restoreBoundaryPathId,
  restoreSceneId,
  validateWorld,
} from "./scene-model.mjs";
import { createDevEditor } from "./dev-editor.mjs";

const image = document.querySelector("#scene-image");
const overlay = document.querySelector("#path-overlay");
const status = document.querySelector("#scene-status");
const coarsePointer = window.matchMedia("(pointer: coarse)");
const activePointers = new Map();
const publicRoot = new URL("../", import.meta.url);
const debugPalette = [
  { stroke: "#ff453a", fill: "rgba(255, 69, 58, 0.28)" },
  { stroke: "#32d74b", fill: "rgba(50, 215, 75, 0.28)" },
  { stroke: "#0a84ff", fill: "rgba(10, 132, 255, 0.28)" },
  { stroke: "#ffd60a", fill: "rgba(255, 214, 10, 0.28)" },
];

let gestureCancelled = false;
let world;
let scenes;
let currentScene;
let currentBoundaryPath;
let currentView = "scene";
let developmentToolsAvailable = false;
let devEditor = null;

function isDevelopmentHost() {
  return ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}

function publicUrl(source) {
  if (!source || /^(?:data:|blob:|https?:)/i.test(source)) return source;
  return new URL(source.replace(/^\/+/, ""), publicRoot).href;
}

function pointsToAttribute(points) {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function regionCenter(points) {
  const total = points.reduce((sum, [x, y]) => ({ x: sum.x + x, y: sum.y + y }), { x: 0, y: 0 });
  return { x: total.x / points.length, y: total.y / points.length };
}

function usesMobileRegions() {
  return coarsePointer.matches || window.innerWidth <= 640;
}

function preload(source) {
  const preloadImage = new Image();
  preloadImage.src = publicUrl(source);
}

function preloadReachable(scene) {
  for (const source of reachableImages(scene, scenes)) preload(source);
  if (scene.paths.some((path) => path.status === "pending")) preload(world.contentBoundary.symbolImage);
}

function saveProgress(sceneId, extra = {}) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(makeSavePayload(sceneId, world.worldVersion, extra)));
}

function configureDevelopmentTools(params) {
  developmentToolsAvailable = params.get("dev") === "1";
}

function renderImage(source, asset) {
  image.src = publicUrl(source);
  image.width = asset.width;
  image.height = asset.height;
}

function activatePath(path) {
  if (devEditor && (path.status === "pending" || path.status === "editor-draft")) {
    devEditor.openIncomplete(path);
    return;
  }
  if (path.kind === "boundary-symbol") {
    localStorage.removeItem(SAVE_KEY);
    renderEpilogue();
    return;
  }
  if (path.status === "pending") {
    saveProgress(currentScene.id, { pending_path_id: path.id, boundary_state: "symbol" });
    renderBoundary(path);
    return;
  }
  const nextScene = scenes.get(path.targetSceneId);
  if (!nextScene) return;
  saveProgress(nextScene.id);
  if (devEditor) devEditor.navigateToScene(nextScene.id);
  else renderScene(nextScene);
}

function bindPointerActivation(node, path) {
  node.addEventListener("pointerdown", (event) => {
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY, pathId: path.id });
    if (activePointers.size > 1) gestureCancelled = true;
  });
  node.addEventListener("pointerup", (event) => {
    const start = activePointers.get(event.pointerId);
    activePointers.delete(event.pointerId);
    if (!start || gestureCancelled || start.pathId !== path.id) {
      if (activePointers.size === 0) gestureCancelled = false;
      return;
    }
    const travel = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (travel <= 12) activatePath(path);
    if (activePointers.size === 0) gestureCancelled = false;
  });
  node.addEventListener("pointercancel", (event) => {
    activePointers.delete(event.pointerId);
    if (activePointers.size === 0) gestureCancelled = false;
  });
  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activatePath(path);
    }
  });
}

function renderOverlay(descriptor) {
  overlay.replaceChildren();
  overlay.setAttribute("viewBox", `0 0 ${descriptor.asset.width} ${descriptor.asset.height}`);
  for (const [index, path] of (descriptor.paths ?? []).entries()) {
    const region = usesMobileRegions() ? path.regions.mobile : path.regions.desktop;
    const color = debugPalette[index % debugPalette.length];
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", pointsToAttribute(region));
    polygon.setAttribute("class", "hit-region");
    polygon.setAttribute("role", "link");
    polygon.setAttribute("tabindex", "0");
    polygon.setAttribute("aria-label", path.accessibleName);
    polygon.style.setProperty("--debug-color", color.stroke);
    polygon.style.setProperty("--debug-fill", color.fill);
    polygon.dataset.pathId = path.id;
    bindPointerActivation(polygon, path);
    overlay.append(polygon);

    const center = regionCenter(region);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(center.x));
    label.setAttribute("y", String(center.y));
    label.setAttribute("class", "debug-label");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("aria-hidden", "true");
    label.textContent = path.id;
    overlay.append(label);
  }
}

function boundaryDescriptor() {
  return {
    asset: world.contentBoundary.asset,
    paths: [{
      id: "CONTENT-BOUNDARY-SYMBOL",
      kind: "boundary-symbol",
      accessibleName: "Continue through the unresolved boundary glyph",
      regions: world.contentBoundary.symbolRegions,
    }],
  };
}

function renderCurrentOverlay() {
  if (currentView === "scene" && devEditor) devEditor.render();
  else if (currentView === "scene") renderOverlay(currentScene);
  else if (currentView === "boundary") renderOverlay(boundaryDescriptor());
  else overlay.replaceChildren();
}

function renderScene(scene) {
  currentScene = scene;
  currentBoundaryPath = null;
  currentView = "scene";
  document.body.dataset.view = currentView;
  delete document.body.dataset.frontier;
  renderImage(scene.image, scene.asset);
  if (devEditor) devEditor.sceneChanged(scene);
  else renderOverlay(scene);
  preloadReachable(scene);
  status.textContent = `Entered ${scene.accessibleName}.`;
}

function renderBoundary(path) {
  currentBoundaryPath = path;
  currentView = "boundary";
  document.body.dataset.view = currentView;
  document.body.dataset.frontier = path.id;
  renderImage(world.contentBoundary.symbolImage, world.contentBoundary.asset);
  renderOverlay(boundaryDescriptor());
  preload(world.contentBoundary.epilogueImage);
  status.textContent = `Reached ${world.contentBoundary.symbolAccessibleName}.`;
}

function renderEpilogue() {
  currentBoundaryPath = null;
  currentView = "epilogue";
  document.body.dataset.view = currentView;
  delete document.body.dataset.frontier;
  renderImage(world.contentBoundary.epilogueImage, world.contentBoundary.asset);
  overlay.replaceChildren();
  status.textContent = `Entered ${world.contentBoundary.epilogueAccessibleName}.`;
}

function pointerCoordinates(event) {
  const rect = overlay.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const asset = currentView === "scene" ? currentScene.asset : world.contentBoundary.asset;
  return {
    x: ((event.clientX - rect.left) / rect.width) * asset.width,
    y: ((event.clientY - rect.top) / rect.height) * asset.height,
  };
}

async function start() {
  const response = await fetch(publicUrl("/scenes/scenes.json"), { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load scene registry (${response.status})`);
  world = await response.json();
  const validationErrors = validateWorld(world);
  if (validationErrors.length) throw new Error(validationErrors.join("\n"));
  scenes = indexScenes(world);

  const params = new URLSearchParams(window.location.search);
  configureDevelopmentTools(params);
  let staging = null;
  let routePackets = null;
  if (developmentToolsAvailable) {
    const [stagingResponse, routePacketResponse] = await Promise.all([
      fetch(publicUrl("/scenes/staging-scenes.json"), { cache: "no-store" }),
      fetch(publicUrl("/scenes/route-packets.json"), { cache: "no-store" }),
    ]);
    staging = stagingResponse.ok ? await stagingResponse.json() : null;
    routePackets = routePacketResponse.ok ? await routePacketResponse.json() : null;
    for (const candidate of staging?.candidates ?? []) scenes.set(candidate.id, candidate);
  }
  if (params.get("reset") === "1") localStorage.removeItem(SAVE_KEY);
  const directSceneId = developmentToolsAvailable ? params.get("scene") : null;
  const rawSave = localStorage.getItem(SAVE_KEY);
  const restoredId = directSceneId && scenes.has(directSceneId)
    ? directSceneId
    : restoreSceneId(rawSave, world, directSceneId);
  const restoredScene = scenes.get(restoredId);
  const boundaryPathId = directSceneId ? null : restoreBoundaryPathId(rawSave, world, restoredId);
  const boundaryPath = restoredScene.paths.find((path) => path.id === boundaryPathId);

  const preservedParams = new URLSearchParams();
  if (developmentToolsAvailable) {
    preservedParams.set("dev", "1");
    preservedParams.set("scene", restoredScene.id);
    if (params.get("static") === "1") preservedParams.set("static", "1");
  }
  const preservedQuery = preservedParams.toString();
  if (window.location.search !== (preservedQuery ? `?${preservedQuery}` : "")) {
    history.replaceState(null, "", `${window.location.pathname}${preservedQuery ? `?${preservedQuery}` : ""}`);
  }

  if (developmentToolsAvailable) {
    const annotationResponse = await fetch(publicUrl("/scenes/manual-route-annotations.json"), { cache: "no-store" });
    const annotations = annotationResponse.ok ? await annotationResponse.json() : null;
    devEditor = createDevEditor({
      world,
      scenes,
      annotations,
      staging,
      routePackets,
      saveMode: isDevelopmentHost() && params.get("static") !== "1" ? "server" : "browser",
      stage: document.querySelector("[data-scene-stage]"),
      image,
      overlay,
      getCurrentScene: () => currentScene,
      showScene: (scene) => renderScene(scene),
      renderPlayableOverlay: renderOverlay,
      toAssetPoint: pointerCoordinates,
      resolvePublicUrl: publicUrl,
    });
  }

  if (boundaryPath) renderBoundary(boundaryPath);
  else renderScene(restoredScene);

  coarsePointer.addEventListener("change", renderCurrentOverlay);
  window.addEventListener("resize", renderCurrentOverlay);
}

image.addEventListener("error", () => console.error(`Missing scene image: ${image.src}`));
start().catch((error) => console.error(error));
