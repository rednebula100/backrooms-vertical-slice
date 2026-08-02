import { clamp, deriveMobileRegion, insertPointOnNearestEdge } from "./editor-geometry.mjs";
import { EditorMotion } from "./editor-motion.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const DRAFT_KEY_PREFIX = "backrooms.route-editor.";
const COLORS = ["#cba15b", "#62b88b", "#669dc1", "#b8aa5c", "#987fb0", "#b96c76"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pointsAttribute(points) {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function sceneMasks(scene) {
  return scene.paths.map((path) => ({
    id: path.id,
    sourcePathId: path.id,
    status: path.status,
    regions: clone(path.regions),
  }));
}

function nextDraftId(sceneId, masks) {
  const used = new Set(masks.map((mask) => mask.id));
  let index = 1;
  while (used.has(`MASK-${sceneId}-${String(index).padStart(2, "0")}`)) index += 1;
  return `MASK-${sceneId}-${String(index).padStart(2, "0")}`;
}

function svgNode(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function buttonPressed(container, selector, value, dataName) {
  for (const button of container.querySelectorAll(selector)) {
    button.setAttribute("aria-pressed", String(button.dataset[dataName] === value));
  }
}

export function createDevEditor({
  world,
  scenes,
  annotations,
  saveMode = "server",
  stage,
  image,
  overlay,
  getCurrentScene,
  showScene,
  renderPlayableOverlay,
  toAssetPoint,
}) {
  const motion = new EditorMotion();
  const orderedScenes = [...scenes.values()];
  const draftKey = `${DRAFT_KEY_PREFIX}${world.worldVersion}`;
  const stored = loadStoredDrafts();
  const states = new Map();
  const histories = new Map();
  const dirtyScenes = new Set();
  const saveTimers = new Map();
  const saveRevisions = new Map();
  const saveStates = new Map();
  let mode = "edit";
  let viewport = "desktop";
  let masksVisible = true;
  let selectedMaskId = null;
  let selectedVertex = null;
  let drawing = null;
  let dragging = null;
  let incompletePath = null;
  let sceneFilter = "";

  document.body.dataset.editor = "true";
  document.body.dataset.editorMode = mode;
  document.body.dataset.debug = "true";

  const root = document.createElement("section");
  root.className = "dev-editor";
  root.setAttribute("aria-label", "Route mask editor");
  root.innerHTML = `
    <aside class="editor-rail editor-glass" data-editor-rail>
      <header class="editor-brand">
        <span class="editor-brand-mark" aria-hidden="true"></span>
        <span><strong>MASK EDITOR</strong><small>BACKROOMS / LEVEL 0</small></span>
      </header>
      <div class="editor-nav-row">
        <button class="icon-button" type="button" data-history-back aria-label="이전 장면">←</button>
        <button class="icon-button" type="button" data-history-forward aria-label="다음 장면">→</button>
        <button class="icon-button" type="button" data-parent-scene aria-label="부모 장면">↑</button>
        <button class="icon-button" type="button" data-exit-editor aria-label="에디터 종료">×</button>
      </div>
      <label class="editor-search"><span class="sr-only">장면 찾기</span><input type="search" placeholder="장면 ID 검색" autocomplete="off" data-scene-search /></label>
      <div class="scene-list" data-scene-list></div>
      <footer class="editor-rail-footer"><span><kbd>Ctrl Z</kbd> 실행 취소</span><span><kbd>Delete</kbd> 점 / 통로 삭제</span><span><kbd>Enter</kbd> 그리기 완료</span></footer>
    </aside>

    <header class="editor-topbar editor-glass" data-editor-topbar>
      <div class="scene-heading"><span data-scene-kicker>현재 장면</span><strong data-current-scene>—</strong><small data-scene-description></small></div>
      <div class="editor-segment" aria-label="편집 모드">
        <button type="button" data-mode="edit" aria-pressed="true">편집</button>
        <button type="button" data-mode="test" aria-pressed="false">클릭 테스트</button>
      </div>
      <div class="editor-segment compact" aria-label="영역 종류">
        <button type="button" data-viewport="desktop" aria-pressed="true">D</button>
        <button type="button" data-viewport="mobile" aria-pressed="false">M</button>
      </div>
      <button class="editor-action quiet" type="button" data-toggle-masks aria-pressed="true">마스크 켬</button>
      <button class="editor-action quiet export-action" type="button" data-export-annotations aria-label="주석 JSON 내보내기">JSON ↓</button>
      <span class="autosave-status" data-auto-save-status data-state="idle"><i aria-hidden="true"></i><span data-auto-save-label>자동 반영</span></span>
    </header>

    <aside class="editor-inspector editor-glass" data-editor-inspector>
      <section class="inspector-summary">
        <span class="eyebrow">통로</span>
        <strong data-route-count>0</strong>
        <small>현재 마스크</small>
      </section>
      <div class="inspector-actions">
        <button class="editor-action primary" type="button" data-new-mask>+ 새 통로 그리기</button>
        <div class="history-buttons"><button type="button" data-undo disabled>↶ 실행 취소</button><button type="button" data-redo disabled>↷ 다시 실행</button></div>
      </div>
      <section class="inspector-section">
        <div class="section-title"><span>현재 장면의 통로</span><small data-draft-count></small></div>
        <div class="mask-list" data-mask-list></div>
      </section>
      <section class="selected-strip" data-selected-details>
        <button type="button" data-delete-mask hidden>삭제</button>
        <strong data-selected-id>선택 없음</strong>
        <small data-selected-meta>이미지에서 통로를 선택하세요</small>
      </section>
    </aside>

    <div class="editor-toast" role="status" aria-live="polite" data-editor-toast></div>
    <div class="drawing-banner" data-drawing-banner hidden><span>통로 외곽을 순서대로 찍으세요</span><small>Enter 완료 · Esc 취소</small></div>
    <div class="test-mode-toolbar" data-test-mode-toolbar>
      <span data-test-scene>—</span>
      <button type="button" data-exit-test>편집으로 <kbd>Esc</kbd></button>
    </div>
    <section class="incomplete-overlay" data-incomplete-overlay hidden>
      <span>연결되지 않은 통로</span>
      <strong data-incomplete-id>—</strong>
      <p>다음 장면이 아직 만들어지지 않았습니다.</p>
      <button type="button" data-close-incomplete>돌아가기</button>
    </section>
  `;
  document.body.append(root);

  const elements = Object.fromEntries([...root.querySelectorAll("[data-scene-list], [data-scene-search], [data-current-scene], [data-scene-description], [data-route-count], [data-draft-count], [data-mask-list], [data-selected-id], [data-selected-meta], [data-delete-mask], [data-undo], [data-redo], [data-new-mask], [data-toggle-masks], [data-auto-save-status], [data-auto-save-label], [data-editor-toast], [data-drawing-banner], [data-parent-scene], [data-test-scene], [data-incomplete-overlay], [data-incomplete-id]")].map((node) => {
    const key = Object.keys(node.dataset)[0];
    return [key, node];
  }));

  function loadStoredDrafts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(draftKey));
      return parsed?.worldVersion === world.worldVersion ? parsed.scenes ?? {} : {};
    } catch {
      return {};
    }
  }

  function getState(scene = getCurrentScene()) {
    if (!scene) return { masks: [] };
    if (!states.has(scene.id)) {
      const annotatedMasks = annotations?.scenes?.find((entry) => entry.sceneId === scene.id)?.masks;
      const savedMasks = stored[scene.id]?.masks ?? annotatedMasks;
      const currentPathIds = new Set(scene.paths.map((path) => path.id));
      const safeSaved = Array.isArray(savedMasks)
        ? savedMasks.filter((mask) => !mask.sourcePathId || currentPathIds.has(mask.sourcePathId))
        : null;
      const masks = Array.isArray(safeSaved) ? safeSaved : sceneMasks(scene);
      states.set(scene.id, { masks: clone(masks) });
      histories.set(scene.id, { past: [], future: [] });
    }
    return states.get(scene.id);
  }

  function persistDrafts() {
    const sceneEntries = {};
    for (const [sceneId, state] of states) sceneEntries[sceneId] = { masks: state.masks };
    localStorage.setItem(draftKey, JSON.stringify({ worldVersion: world.worldVersion, scenes: sceneEntries }));
  }

  function snapshot(scene = getCurrentScene()) {
    return clone(getState(scene).masks);
  }

  function scheduleAutoSave(sceneId = getCurrentScene().id) {
    dirtyScenes.add(sceneId);
    const revision = (saveRevisions.get(sceneId) ?? 0) + 1;
    saveRevisions.set(sceneId, revision);
    saveStates.set(sceneId, "pending");
    window.clearTimeout(saveTimers.get(sceneId));
    saveTimers.set(sceneId, window.setTimeout(() => saveScene(sceneId, revision), 360));
  }

  function recordChange(previous, scene = getCurrentScene()) {
    const history = histories.get(scene.id);
    history.past.push(previous);
    if (history.past.length > 80) history.past.shift();
    history.future = [];
    persistDrafts();
    scheduleAutoSave(scene.id);
    render();
  }

  function mutate(callback) {
    const previous = snapshot();
    callback(getState());
    recordChange(previous);
  }

  function undo() {
    const scene = getCurrentScene();
    const history = histories.get(scene.id);
    if (!history.past.length) return;
    history.future.push(snapshot(scene));
    getState(scene).masks = history.past.pop();
    persistDrafts();
    scheduleAutoSave(scene.id);
    render();
  }

  function redo() {
    const scene = getCurrentScene();
    const history = histories.get(scene.id);
    if (!history.future.length) return;
    history.past.push(snapshot(scene));
    getState(scene).masks = history.future.pop();
    persistDrafts();
    scheduleAutoSave(scene.id);
    render();
  }

  function selectedMask() {
    return getState().masks.find((mask) => mask.id === selectedMaskId) ?? null;
  }

  function setMode(nextMode) {
    if (drawing) cancelDrawing();
    if (nextMode === "edit") closeIncomplete();
    mode = nextMode;
    document.body.dataset.editorMode = mode;
    buttonPressed(root, "[data-mode]", mode, "mode");
    render();
    motion.play(stage, [{ opacity: 0.72 }, { opacity: 1 }], "fast");
  }

  function setViewport(nextViewport) {
    viewport = nextViewport;
    buttonPressed(root, "[data-viewport]", viewport, "viewport");
    render();
  }

  function toggleMasks() {
    masksVisible = !masksVisible;
    elements.toggleMasks.setAttribute("aria-pressed", String(masksVisible));
    elements.toggleMasks.textContent = masksVisible ? "마스크 켬" : "마스크 끔";
    document.body.dataset.debug = String(masksVisible);
    render();
  }

  function closeIncomplete() {
    incompletePath = null;
    elements.incompleteOverlay.hidden = true;
  }

  function openIncomplete(path) {
    incompletePath = path;
    elements.incompleteId.textContent = path.id;
    elements.incompleteOverlay.hidden = false;
    motion.enterPanel(elements.incompleteOverlay, "right");
  }

  function navigateToScene(sceneId, historyMode = "push") {
    const scene = scenes.get(sceneId);
    if (!scene) return;
    const url = new URL(window.location.href);
    url.searchParams.set("dev", "1");
    url.searchParams.set("scene", sceneId);
    if (historyMode === "push") history.pushState({ sceneId }, "", url);
    else if (historyMode === "replace") history.replaceState({ sceneId }, "", url);
    selectedMaskId = null;
    selectedVertex = null;
    drawing = null;
    closeIncomplete();
    showScene(scene);
  }

  function startDrawing() {
    if (mode !== "edit") setMode("edit");
    const state = getState();
    drawing = {
      id: nextDraftId(getCurrentScene().id, state.masks),
      points: [],
      before: snapshot(),
    };
    selectedMaskId = drawing.id;
    selectedVertex = null;
    elements.drawingBanner.hidden = false;
    elements.newMask.textContent = "점 찍는 중…";
    render();
    toast("이미지에서 통로 외곽을 순서대로 찍으세요");
  }

  function finishDrawing() {
    if (!drawing) return;
    if (drawing.points.length < 3) {
      toast("통로를 만들려면 점이 3개 이상 필요합니다", true);
      return;
    }
    const scene = getCurrentScene();
    const desktop = clone(drawing.points);
    const regions = viewport === "desktop"
      ? { desktop, mobile: deriveMobileRegion(desktop, scene.asset) }
      : { desktop: clone(drawing.points), mobile: clone(drawing.points) };
    getState().masks.push({ id: drawing.id, sourcePathId: null, status: "draft", regions });
    const previous = drawing.before;
    drawing = null;
    elements.drawingBanner.hidden = true;
    elements.newMask.textContent = "+ 새 통로 그리기";
    recordChange(previous);
    toast("새 통로 마스크를 초안에 추가했습니다");
  }

  function cancelDrawing() {
    if (!drawing) return;
    drawing = null;
    selectedMaskId = null;
    elements.drawingBanner.hidden = true;
    elements.newMask.textContent = "+ 새 통로 그리기";
    render();
  }

  function removeSelectedMask() {
    const mask = selectedMask();
    if (!mask) return;
    if (getState().masks.length <= 1) {
      toast("통로는 최소 하나 남겨야 합니다", true);
      return;
    }
    selectedMaskId = null;
    selectedVertex = null;
    mutate((state) => {
      state.masks = state.masks.filter((candidate) => candidate.id !== mask.id);
    });
    toast(`${mask.id} 삭제됨`);
  }

  function removeMaskVertex(mask, pointIndex) {
    if (!mask || pointIndex === null) return;
    const points = mask.regions[viewport];
    if (points.length <= 3) {
      toast("폴리곤은 최소 3개의 점이 필요합니다", true);
      return;
    }
    selectedVertex = null;
    mutate(() => {
      mask.regions[viewport].splice(pointIndex, 1);
      if (viewport === "desktop") mask.regions.mobile = deriveMobileRegion(mask.regions.desktop, getCurrentScene().asset);
    });
  }

  function removeSelectedVertex() {
    removeMaskVertex(selectedMask(), selectedVertex);
  }

  function toast(message, warning = false) {
    elements.editorToast.textContent = message;
    elements.editorToast.dataset.warning = String(warning);
    elements.editorToast.dataset.visible = "true";
    motion.play(elements.editorToast, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], "panel");
    window.clearTimeout(toast.timeout);
    window.clearTimeout(toast.clearTimeout);
    toast.timeout = window.setTimeout(() => { elements.editorToast.dataset.visible = "false"; }, 2200);
    toast.clearTimeout = window.setTimeout(() => { elements.editorToast.textContent = ""; }, 2450);
  }

  function annotationRecord(scene) {
    const masks = clone(getState(scene).masks);
    const sourceIds = new Set(masks.map((mask) => mask.sourcePathId).filter(Boolean));
    const hasNewRoutes = masks.some((mask) => !mask.sourcePathId);
    const hasRemovedRoutes = scene.paths.some((path) => !sourceIds.has(path.id));
    return {
      sceneId: scene.id,
      image: scene.image,
      observedVisibleRouteCount: masks.length,
      annotationStatus: scene.staging
        ? "staging-masks-confirmed"
        : hasNewRoutes
          ? "needs-route-registration"
          : hasRemovedRoutes
            ? "needs-route-reconciliation"
            : "masks-confirmed",
      masks,
    };
  }

  function exportAnnotations() {
    const payload = {
      worldVersion: world.worldVersion,
      updatedAt: new Date().toISOString(),
      scenes: orderedScenes.map(annotationRecord).sort((first, second) => first.sceneId.localeCompare(second.sceneId)),
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `manual-route-annotations-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 0);
    toast("주석 JSON을 내보냈습니다");
  }

  function shortPathId(pathId) {
    return pathId?.split("-").at(-1) ?? "?";
  }

  function connectionLabel(mask, scene = getCurrentScene()) {
    if (!mask.sourcePathId) return "미완성";
    const path = scene.paths.find((candidate) => candidate.id === mask.sourcePathId);
    if (!path || path.status === "pending") return "미완성";
    return path.targetSceneId ?? "미완성";
  }

  function createTerminalNode(pathId, label, state = "incomplete") {
    const item = document.createElement("li");
    item.className = "scene-tree-terminal";
    item.dataset.state = state;
    item.innerHTML = `<span class="tree-edge-label">${shortPathId(pathId)}</span><span class="terminal-mark"></span><span><b>${label}</b><small>${state === "removed" ? "마스크에서 제외됨" : "다음 장면 없음"}</small></span>`;
    return item;
  }

  function createSceneBranch(scene, depth = 0, incoming = null, ancestry = new Set()) {
    const item = document.createElement("li");
    item.className = "scene-tree-branch";
    if (incoming) {
      item.dataset.connection = incoming.included ? "active" : "removed";
      const edge = document.createElement("span");
      edge.className = "tree-edge-label";
      edge.textContent = shortPathId(incoming.path.id);
      item.append(edge);
    }

    const button = document.createElement("button");
    const masks = getState(scene).masks;
    const hasIncomplete = masks.some((mask) => connectionLabel(mask, scene) === "미완성");
    button.type = "button";
    button.className = "scene-tree-node";
    button.dataset.current = String(scene.id === getCurrentScene().id);
    button.dataset.incomplete = String(hasIncomplete);
    button.innerHTML = `<span class="tree-node-mark"></span><span><b>${scene.id}</b><small>단계 ${depth}</small></span><em>${masks.length}</em>`;
    button.addEventListener("click", () => navigateToScene(scene.id));
    item.append(button);

    if (ancestry.has(scene.id)) return item;
    const nextAncestry = new Set(ancestry).add(scene.id);
    const children = document.createElement("ul");
    const masksBySource = new Map(masks.filter((mask) => mask.sourcePathId).map((mask) => [mask.sourcePathId, mask]));
    for (const path of scene.paths) {
      const included = masksBySource.has(path.id);
      if (path.status === "active" && scenes.has(path.targetSceneId)) {
        children.append(createSceneBranch(scenes.get(path.targetSceneId), depth + 1, { path, included }, nextAncestry));
      } else {
        children.append(createTerminalNode(path.id, "미완성 구역", included ? "incomplete" : "removed"));
      }
    }
    for (const mask of masks.filter((candidate) => !candidate.sourcePathId)) {
      children.append(createTerminalNode(mask.id, "새 미완성 통로"));
    }
    if (children.childElementCount) item.append(children);
    return item;
  }

  function renderSceneList() {
    const query = sceneFilter.trim().toLowerCase();
    elements.sceneList.replaceChildren();
    if (query) {
      const results = document.createElement("div");
      results.className = "scene-search-results";
      for (const scene of orderedScenes.filter((candidate) => `${candidate.id} ${candidate.accessibleName}`.toLowerCase().includes(query))) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "scene-search-result";
        button.innerHTML = `<b>${scene.id}</b><small>${scene.accessibleName}</small>`;
        button.addEventListener("click", () => navigateToScene(scene.id));
        results.append(button);
      }
      elements.sceneList.append(results);
      return;
    }
    const tree = document.createElement("ul");
    tree.className = "scene-tree";
    tree.append(createSceneBranch(scenes.get(world.startSceneId)));
    elements.sceneList.append(tree);

    const stagingScenes = orderedScenes.filter((scene) => scene.staging);
    if (stagingScenes.length) {
      const queue = document.createElement("section");
      queue.className = "staging-queue";
      queue.innerHTML = `<div class="staging-queue-title"><span>검수 대기</span><em>${stagingScenes.length}</em></div>`;
      for (const scene of stagingScenes) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "staging-scene-node";
        button.dataset.current = String(scene.id === getCurrentScene().id);
        button.dataset.state = scene.status;
        button.innerHTML = `<span class="staging-scene-mark"></span><span><b>${scene.id}</b><small>${scene.sourceSceneId} · ${shortPathId(scene.sourcePathId)}에서 생성</small></span><em>${getState(scene).masks.length || "·"}</em>`;
        button.addEventListener("click", () => navigateToScene(scene.id));
        queue.append(button);
      }
      elements.sceneList.append(queue);
    }
    const currentNode = elements.sceneList.querySelector('[data-current="true"]');
    if (currentNode) {
      const listRect = elements.sceneList.getBoundingClientRect();
      const nodeRect = currentNode.getBoundingClientRect();
      elements.sceneList.scrollTop += nodeRect.top - listRect.top - elements.sceneList.clientHeight / 2 + nodeRect.height / 2;
    }
  }

  function renderMaskList(masks) {
    elements.maskList.replaceChildren();
    for (const [index, mask] of masks.entries()) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mask-list-item";
      button.dataset.selected = String(mask.id === selectedMaskId);
      button.dataset.incomplete = String(connectionLabel(mask) === "미완성");
      button.style.setProperty("--mask-color", COLORS[index % COLORS.length]);
      button.innerHTML = `<i></i><span><b>${shortPathId(mask.id)} → ${connectionLabel(mask)}</b><small>${mask.id}</small></span><em>${mask.regions[viewport].length}점</em>`;
      button.addEventListener("click", () => {
        selectedMaskId = mask.id;
        selectedVertex = null;
        render();
      });
      elements.maskList.append(button);
    }
  }

  function renderEditableOverlay(scene, masks) {
    overlay.replaceChildren();
    overlay.setAttribute("viewBox", `0 0 ${scene.asset.width} ${scene.asset.height}`);
    for (const [index, mask] of masks.entries()) {
      const color = COLORS[index % COLORS.length];
      const points = mask.regions[viewport];
      const polygon = svgNode("polygon", {
        points: pointsAttribute(points),
        class: "editor-region",
        tabindex: "0",
        role: "button",
        "aria-label": `${mask.id} 통로 영역`,
      });
      polygon.dataset.maskId = mask.id;
      polygon.dataset.selected = String(mask.id === selectedMaskId);
      polygon.style.setProperty("--mask-color", color);
      polygon.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        selectedMaskId = mask.id;
        selectedVertex = null;
        render();
      });
      polygon.addEventListener("dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const point = toAssetPoint(event);
        if (!point) return;
        mutate(() => {
          mask.regions[viewport] = insertPointOnNearestEdge(mask.regions[viewport], [Math.round(point.x), Math.round(point.y)]);
          if (viewport === "desktop") mask.regions.mobile = deriveMobileRegion(mask.regions.desktop, scene.asset);
        });
      });
      overlay.append(polygon);

      if (mask.id !== selectedMaskId) continue;
      for (const [pointIndex, [x, y]] of points.entries()) {
        const handle = svgNode("circle", { cx: x, cy: y, r: 11, class: "vertex-handle" });
        handle.dataset.selected = String(pointIndex === selectedVertex);
        handle.style.setProperty("--mask-color", color);
        handle.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          selectedVertex = pointIndex;
          dragging = { maskId: mask.id, pointIndex, pointerId: event.pointerId, previous: snapshot() };
          renderInspector(masks);
        });
        handle.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          event.stopPropagation();
          selectedMaskId = mask.id;
          selectedVertex = pointIndex;
          removeMaskVertex(mask, pointIndex);
        });
        overlay.append(handle);
      }
    }

    if (drawing) {
      const shape = svgNode(drawing.points.length >= 3 ? "polygon" : "polyline", {
        points: pointsAttribute(drawing.points),
        class: "drawing-shape",
      });
      overlay.append(shape);
      for (const [x, y] of drawing.points) overlay.append(svgNode("circle", { cx: x, cy: y, r: 10, class: "drawing-point" }));
    }
  }

  function renderInspector(masks = getState().masks) {
    const scene = getCurrentScene();
    const mask = selectedMask();
    const incompleteCount = masks.filter((candidate) => connectionLabel(candidate, scene) === "미완성").length;
    const history = histories.get(scene.id);
    elements.routeCount.textContent = String(masks.length);
    elements.draftCount.textContent = incompleteCount ? `${incompleteCount} 미완성` : "연결 완료";
    elements.selectedId.textContent = mask?.id ?? "선택 없음";
    elements.selectedMeta.textContent = mask
      ? `${shortPathId(mask.id)} → ${connectionLabel(mask, scene)} · ${mask.regions[viewport].length}점`
      : "이미지에서 통로를 선택하세요";
    elements.deleteMask.hidden = !mask;
    elements.undo.disabled = history.past.length === 0;
    elements.redo.disabled = history.future.length === 0;
    const autoSaveState = saveStates.get(scene.id) ?? "idle";
    elements.autoSaveStatus.dataset.state = autoSaveState;
    elements.autoSaveLabel.textContent = {
      idle: "자동 반영",
      pending: "반영 대기",
      saving: "반영 중",
      saved: "반영됨",
      error: "반영 실패",
    }[autoSaveState];
    renderMaskList(masks);
  }

  function render() {
    const scene = getCurrentScene();
    if (!scene) return;
    const masks = getState(scene).masks;
    document.body.dataset.debug = String(mode === "edit" && masksVisible);
    elements.currentScene.textContent = scene.id;
    elements.sceneDescription.textContent = scene.accessibleName;
    elements.testScene.textContent = scene.id;
    elements.parentScene.disabled = !scene.sourceSceneId;
    buttonPressed(root, "[data-mode]", mode, "mode");
    buttonPressed(root, "[data-viewport]", viewport, "viewport");
    renderSceneList();
    renderInspector(masks);
    if (mode === "test") {
      const paths = masks.map((mask) => {
        const path = mask.sourcePathId ? scene.paths.find((candidate) => candidate.id === mask.sourcePathId) : null;
        if (path) return { ...path, regions: mask.regions };
        return {
          id: mask.id,
          status: "editor-draft",
          accessibleName: `Open unfinished route ${mask.id}`,
          regions: mask.regions,
        };
      });
      renderPlayableOverlay({ ...scene, paths });
    } else {
      renderEditableOverlay(scene, masks);
    }
  }

  async function saveScene(sceneId, revision) {
    if (saveStates.get(sceneId) === "saving") {
      saveTimers.set(sceneId, window.setTimeout(() => saveScene(sceneId, saveRevisions.get(sceneId)), 180));
      return;
    }
    const scene = scenes.get(sceneId);
    if (!scene) return;
    const masks = clone(getState(scene).masks);
    saveStates.set(sceneId, "saving");
    if (getCurrentScene()?.id === sceneId) renderInspector();
    if (saveMode === "browser") {
      dirtyScenes.delete(scene.id);
      saveStates.set(sceneId, "saved");
      if (getCurrentScene()?.id === sceneId) {
        renderInspector();
        motion.confirm(elements.autoSaveStatus);
      }
      window.setTimeout(() => {
        if (saveStates.get(sceneId) !== "saved") return;
        saveStates.set(sceneId, "idle");
        if (getCurrentScene()?.id === sceneId) renderInspector();
      }, 1200);
      return;
    }
    try {
      const response = await fetch("/__dev/editor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worldVersion: world.worldVersion, sceneId: scene.id, masks }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
      if (revision !== saveRevisions.get(sceneId)) {
        saveStates.set(sceneId, "pending");
        if (getCurrentScene()?.id === sceneId) renderInspector();
        return;
      }
      for (const path of scene.paths) {
        const mask = masks.find((candidate) => candidate.sourcePathId === path.id);
        if (mask) path.regions = clone(mask.regions);
      }
      dirtyScenes.delete(scene.id);
      saveStates.set(sceneId, "saved");
      if (getCurrentScene()?.id === sceneId) {
        renderInspector();
        motion.confirm(elements.autoSaveStatus);
      }
      window.setTimeout(() => {
        if (saveStates.get(sceneId) !== "saved") return;
        saveStates.set(sceneId, "idle");
        if (getCurrentScene()?.id === sceneId) renderInspector();
      }, 1200);
    } catch {
      saveStates.set(sceneId, "error");
      if (getCurrentScene()?.id === sceneId) renderInspector();
      toast("자동 반영에 실패했습니다", true);
    }
  }

  root.addEventListener("click", (event) => {
    const modeButton = event.target.closest("[data-mode]");
    if (modeButton) setMode(modeButton.dataset.mode);
    const viewportButton = event.target.closest("[data-viewport]");
    if (viewportButton) setViewport(viewportButton.dataset.viewport);
  });
  root.querySelector("[data-history-back]").addEventListener("click", () => history.back());
  root.querySelector("[data-history-forward]").addEventListener("click", () => history.forward());
  elements.parentScene.addEventListener("click", () => {
    const parent = getCurrentScene().sourceSceneId;
    if (parent) navigateToScene(parent);
  });
  root.querySelector("[data-exit-editor]").addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("dev");
    url.searchParams.delete("scene");
    window.location.assign(url);
  });
  elements.sceneSearch.addEventListener("input", () => {
    sceneFilter = elements.sceneSearch.value;
    renderSceneList();
  });
  elements.newMask.addEventListener("click", () => drawing ? finishDrawing() : startDrawing());
  elements.deleteMask.addEventListener("click", removeSelectedMask);
  elements.undo.addEventListener("click", undo);
  elements.redo.addEventListener("click", redo);
  elements.toggleMasks.addEventListener("click", toggleMasks);
  root.querySelector("[data-export-annotations]").addEventListener("click", exportAnnotations);
  root.querySelector("[data-exit-test]").addEventListener("click", () => setMode("edit"));
  root.querySelector("[data-close-incomplete]").addEventListener("click", closeIncomplete);

  overlay.addEventListener("pointerdown", (event) => {
    if (mode !== "edit" || event.target !== overlay || !drawing) return;
    const point = toAssetPoint(event);
    if (!point) return;
    drawing.points.push([Math.round(point.x), Math.round(point.y)]);
    render();
  });
  window.addEventListener("pointermove", (event) => {
    if (!dragging || mode !== "edit") return;
    const point = toAssetPoint(event);
    if (!point) return;
    const mask = getState().masks.find((candidate) => candidate.id === dragging.maskId);
    if (!mask) return;
    mask.regions[viewport][dragging.pointIndex] = [
      Math.round(clamp(point.x, 0, getCurrentScene().asset.width)),
      Math.round(clamp(point.y, 0, getCurrentScene().asset.height)),
    ];
    if (viewport === "desktop") mask.regions.mobile = deriveMobileRegion(mask.regions.desktop, getCurrentScene().asset);
    renderEditableOverlay(getCurrentScene(), getState().masks);
    renderInspector();
  });
  window.addEventListener("pointerup", (event) => {
    if (!dragging || event.pointerId !== dragging.pointerId) return;
    const previous = dragging.previous;
    dragging = null;
    recordChange(previous);
  });
  window.addEventListener("keydown", (event) => {
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "e") {
      event.preventDefault();
      exportAnnotations();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
      return;
    }
    if (typing) return;
    if (event.key === "Enter" && drawing) {
      event.preventDefault();
      finishDrawing();
    } else if (event.key === "Escape" && drawing) {
      event.preventDefault();
      cancelDrawing();
    } else if (event.key === "Escape" && mode === "test") {
      event.preventDefault();
      if (incompletePath) closeIncomplete();
      else setMode("edit");
    } else if ((event.key === "Delete" || event.key === "Backspace") && selectedMaskId) {
      event.preventDefault();
      if (selectedVertex !== null) removeSelectedVertex();
      else removeSelectedMask();
    } else if (event.key.toLowerCase() === "t") {
      setMode(mode === "edit" ? "test" : "edit");
    }
  });
  window.addEventListener("popstate", () => {
    const sceneId = new URLSearchParams(window.location.search).get("scene");
    if (sceneId && scenes.has(sceneId)) navigateToScene(sceneId, "none");
  });

  function sceneChanged(scene) {
    getState(scene);
    const urlScene = new URLSearchParams(window.location.search).get("scene");
    if (urlScene !== scene.id) navigateToScene(scene.id, "replace");
    else render();
    motion.swapScene(image);
  }

  motion.enterPanel(root.querySelector("[data-editor-rail]"), "left");
  motion.enterPanel(root.querySelector("[data-editor-inspector]"), "right");
  motion.play(root.querySelector("[data-editor-topbar]"), [{ opacity: 0, transform: "translateY(-12px)" }, { opacity: 1, transform: "translateY(0)" }], "panel");

  return {
    render,
    sceneChanged,
    navigateToScene,
    openIncomplete,
    getMode: () => mode,
  };
}
