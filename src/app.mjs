import {
  SAVE_KEY,
  indexScenes,
  makeSavePayload,
  reachableImages,
  restoreSceneId,
  validateWorld,
} from "./scene-model.mjs";

const image = document.querySelector("#scene-image");
const overlay = document.querySelector("#path-overlay");
const status = document.querySelector("#scene-status");
const coarsePointer = window.matchMedia("(pointer: coarse)");
const activePointers = new Map();
let gestureCancelled = false;
let world;
let scenes;
let currentScene;

function isDevelopmentHost() {
  return ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}

function pointsToAttribute(points) {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function usesMobileRegions() {
  return coarsePointer.matches || window.innerWidth <= 640;
}

function preloadReachable(scene) {
  for (const source of reachableImages(scene, scenes)) {
    const preload = new Image();
    preload.src = source;
  }
}

function saveProgress(sceneId, extra = {}) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(makeSavePayload(sceneId, world.worldVersion, extra)));
}

function activatePath(path) {
  if (path.status === "pending") {
    saveProgress(currentScene.id, { pending_path_id: path.id });
    document.body.dataset.frontier = path.id;
    return;
  }
  const nextScene = scenes.get(path.targetSceneId);
  if (!nextScene) return;
  saveProgress(nextScene.id);
  renderScene(nextScene);
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

function renderOverlay(scene) {
  overlay.replaceChildren();
  overlay.setAttribute("viewBox", `0 0 ${scene.asset.width} ${scene.asset.height}`);
  for (const path of scene.paths ?? []) {
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    const region = usesMobileRegions() ? path.regions.mobile : path.regions.desktop;
    polygon.setAttribute("points", pointsToAttribute(region));
    polygon.setAttribute("class", "hit-region");
    polygon.setAttribute("role", "link");
    polygon.setAttribute("tabindex", "0");
    polygon.setAttribute("aria-label", path.accessibleName);
    polygon.dataset.pathId = path.id;
    bindPointerActivation(polygon, path);
    overlay.append(polygon);
  }
}

function renderScene(scene) {
  currentScene = scene;
  image.src = scene.image;
  image.width = scene.asset.width;
  image.height = scene.asset.height;
  renderOverlay(scene);
  preloadReachable(scene);
  status.textContent = `Entered ${scene.accessibleName}.`;
}

async function start() {
  const response = await fetch("/scenes/scenes.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load scene registry (${response.status})`);
  world = await response.json();
  const validationErrors = validateWorld(world);
  if (validationErrors.length) throw new Error(validationErrors.join("\n"));
  scenes = indexScenes(world);

  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") === "1") localStorage.removeItem(SAVE_KEY);
  const directSceneId = isDevelopmentHost() ? params.get("scene") : null;
  const restoredId = restoreSceneId(localStorage.getItem(SAVE_KEY), world, directSceneId);
  if (window.location.search) history.replaceState(null, "", window.location.pathname);
  renderScene(scenes.get(restoredId));

  coarsePointer.addEventListener("change", () => renderOverlay(currentScene));
  window.addEventListener("resize", () => renderOverlay(currentScene));
}

image.addEventListener("error", () => console.error(`Missing scene image: ${image.src}`));
start().catch((error) => console.error(error));
