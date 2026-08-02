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
  routePackets = null,
  stage,
  image,
  overlay,
  getCurrentScene,
  showScene,
  renderPlayableOverlay,
  toAssetPoint,
  resolvePublicUrl = (source) => source,
}) {
  const motion = new EditorMotion();
  const orderedScenes = [...scenes.values()];
  const stagedBySourcePath = new Map(
    orderedScenes
      .filter((scene) => scene.staging && scene.sourcePathId)
      .map((scene) => [scene.sourcePathId, scene]),
  );
  const routePacketBySourcePath = new Map(
    (routePackets?.packets ?? []).map((packet) => [packet.sourcePathId, packet]),
  );
  const draftKey = `${DRAFT_KEY_PREFIX}${world.worldVersion}`;
  const registryFingerprint = orderedScenes
    .map((scene) => `${scene.id}:${scene.paths.map((path) => `${path.id}/${path.status}`).join(",")}`)
    .sort()
    .join("|");
  const annotationRevision = annotations?.updatedAt ?? "none";
  const storedPayload = loadStoredDrafts();
  const stored = storedPayload.scenes;
  const reviewedScenes = new Set([
    ...(storedPayload.reviewedSceneIds ?? []),
    ...(annotations?.scenes ?? [])
      .filter((entry) => entry.reviewComplete === true || ["masks-confirmed", "staging-masks-confirmed"].includes(entry.annotationStatus))
      .map((entry) => entry.sceneId),
  ]);
  const states = new Map();
  const histories = new Map();
  const dirtyScenes = new Set();
  const saveTimers = new Map();
  const saveRevisions = new Map();
  const saveStates = new Map();
  let mode = "graph";
  let viewport = "desktop";
  let graphScale = 1;
  let graphDragging = null;
  let testMasksVisible = false;
  let selectedMaskId = null;
  let selectedVertex = null;
  let drawing = null;
  let dragging = null;
  let incompletePath = null;
  let sceneFilter = "";
  const collapsedScenes = new Set();

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
        <span><strong>ROUTE STUDIO</strong><small>BACKROOMS / LEVEL 0</small></span>
      </header>
      <div class="editor-nav-row">
        <button class="icon-button" type="button" data-history-back aria-label="이전 장면">←</button>
        <button class="icon-button" type="button" data-history-forward aria-label="다음 장면">→</button>
        <button class="icon-button" type="button" data-parent-scene aria-label="부모 장면">↑</button>
        <button class="icon-button" type="button" data-exit-editor aria-label="에디터 종료">×</button>
      </div>
      <label class="editor-search"><span class="sr-only">장면 찾기</span><input type="search" placeholder="장면 ID 검색" autocomplete="off" data-scene-search /></label>
      <section class="rail-focus-card">
        <span>현재 포커스</span>
        <strong data-rail-current>—</strong>
        <small data-rail-parent>시작 장면</small>
        <button type="button" data-focus-current>그래프에서 위치 찾기</button>
        <button type="button" data-open-editor>마스크 편집 열기</button>
      </section>
      <section class="rail-legend" aria-label="그래프 범례">
        <span><i data-kind="current"></i>현재 장면</span>
        <span><i data-kind="candidate"></i>생성 후보</span>
        <span><i data-kind="frontier"></i>미완성 통로</span>
      </section>
      <footer class="editor-rail-footer"><span><kbd>G</kbd> 그래프</span><span><kbd>E</kbd> 마스크 편집</span><span><kbd>T</kbd> 클릭 테스트</span></footer>
    </aside>

    <header class="editor-topbar editor-glass" data-editor-topbar>
      <div class="scene-heading"><span data-scene-kicker>현재 장면</span><strong data-current-scene>—</strong><small data-scene-description></small></div>
      <div class="editor-segment" aria-label="편집 모드">
        <button type="button" data-mode="graph" aria-pressed="true">그래프</button>
        <button type="button" data-mode="edit" aria-pressed="false">마스크</button>
        <button type="button" data-mode="test" aria-pressed="false">테스트</button>
      </div>
      <div class="editor-segment compact" aria-label="영역 종류">
        <button type="button" data-viewport="desktop" aria-pressed="true">D</button>
        <button type="button" data-viewport="mobile" aria-pressed="false">M</button>
      </div>
      <button class="editor-action quiet export-action" type="button" data-export-annotations aria-label="주석 JSON 내보내기">JSON ↓</button>
      <span class="autosave-status" data-auto-save-status data-state="idle"><i aria-hidden="true"></i><span data-auto-save-label>자동 반영</span></span>
    </header>

    <section class="graph-workspace" data-graph-workspace>
      <header class="graph-header">
        <div class="graph-heading"><span>WORLD GRAPH</span><strong>LEVEL 0 ROUTE MAP</strong></div>
        <div class="graph-metrics">
          <span><b data-graph-total>0</b>장면</span>
          <span><b data-graph-frontiers>0</b>미완성</span>
          <span><b data-graph-review>0</b>검수</span>
        </div>
        <div class="graph-controls">
          <button type="button" data-collapse-branches>가지 접기</button>
          <button type="button" data-expand-branches>전부 펼치기</button>
          <button type="button" data-focus-graph>현재 위치</button>
          <button type="button" data-zoom-out aria-label="축소">−</button>
          <span data-graph-scale>100%</span>
          <button type="button" data-zoom-in aria-label="확대">＋</button>
        </div>
      </header>
      <div class="graph-viewport" data-graph-viewport>
        <div class="graph-canvas" data-graph-canvas>
          <div class="scene-list" data-scene-list></div>
        </div>
      </div>
      <footer class="graph-footer"><span>빈 공간 드래그로 이동</span><span>노드 더블클릭으로 마스크 편집</span></footer>
    </section>

    <aside class="editor-inspector editor-glass" data-editor-inspector>
      <section class="inspector-summary">
        <span class="eyebrow">통로</span>
        <strong data-route-count>0</strong>
        <small>현재 마스크</small>
      </section>
      <div class="inspector-actions">
        <button class="editor-action primary" type="button" data-new-mask>+ 새 통로 그리기</button>
        <button class="editor-action review-action" type="button" data-complete-review hidden>검수 완료</button>
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
        <button class="route-packet-open" type="button" data-open-route-packet hidden>생성 입력</button>
      </section>
    </aside>

    <div class="editor-toast" role="status" aria-live="polite" data-editor-toast></div>
    <div class="drawing-banner" data-drawing-banner hidden><span>통로 외곽을 순서대로 찍으세요</span><small>Enter 완료 · Esc 취소</small></div>
    <div class="test-mode-toolbar" data-test-mode-toolbar>
      <span data-test-scene>—</span>
      <button type="button" data-test-mask-toggle aria-pressed="false">영역 보기</button>
      <button type="button" data-exit-test>편집으로 <kbd>Esc</kbd></button>
    </div>
    <section class="incomplete-overlay" data-incomplete-overlay hidden>
      <span>연결되지 않은 통로</span>
      <strong data-incomplete-id>—</strong>
      <p>다음 장면이 아직 만들어지지 않았습니다.</p>
      <button type="button" data-close-incomplete>돌아가기</button>
    </section>
    <section class="route-packet-preview" data-route-packet-preview hidden aria-label="경로 생성 입력 미리보기">
      <header>
        <span><small>ROUTE PACKET</small><strong data-route-packet-id>—</strong></span>
        <button type="button" data-close-route-packet aria-label="닫기">×</button>
      </header>
      <div class="route-packet-images">
        <figure><img data-route-packet-map alt="선택 통로와 금지 통로 지도" /><figcaption>선택 / 금지</figcaption></figure>
        <figure><img data-route-packet-crop alt="선택 통로 원본 크롭" /><figcaption>선택 통로 원본</figcaption></figure>
      </div>
      <footer>
        <span data-route-packet-relation>—</span>
        <span data-route-packet-camera>—</span>
        <strong data-route-packet-status>—</strong>
      </footer>
    </section>
  `;
  document.body.append(root);

  const elements = Object.fromEntries([...root.querySelectorAll("[data-scene-list], [data-scene-search], [data-current-scene], [data-scene-description], [data-route-count], [data-draft-count], [data-mask-list], [data-selected-id], [data-selected-meta], [data-delete-mask], [data-open-route-packet], [data-route-packet-preview], [data-route-packet-id], [data-route-packet-map], [data-route-packet-crop], [data-route-packet-relation], [data-route-packet-camera], [data-route-packet-status], [data-undo], [data-redo], [data-new-mask], [data-complete-review], [data-test-mask-toggle], [data-auto-save-status], [data-auto-save-label], [data-editor-toast], [data-drawing-banner], [data-parent-scene], [data-test-scene], [data-incomplete-overlay], [data-incomplete-id], [data-rail-current], [data-rail-parent], [data-graph-total], [data-graph-frontiers], [data-graph-review], [data-graph-scale], [data-graph-viewport], [data-graph-canvas]")].map((node) => {
    const key = Object.keys(node.dataset)[0];
    return [key, node];
  }));

  function loadStoredDrafts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(draftKey));
      if (parsed?.worldVersion !== world.worldVersion) return { scenes: {}, reviewedSceneIds: [] };
      if (parsed?.registryFingerprint !== registryFingerprint || parsed?.annotationRevision !== annotationRevision) {
        return { scenes: {}, reviewedSceneIds: [] };
      }
      return { scenes: parsed.scenes ?? {}, reviewedSceneIds: parsed.reviewedSceneIds ?? [] };
    } catch {
      return { scenes: {}, reviewedSceneIds: [] };
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
    localStorage.setItem(draftKey, JSON.stringify({
      worldVersion: world.worldVersion,
      registryFingerprint,
      annotationRevision,
      scenes: sceneEntries,
      reviewedSceneIds: [...reviewedScenes].sort(),
    }));
  }

  function invalidateReview(scene = getCurrentScene()) {
    reviewedScenes.delete(scene.id);
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
    invalidateReview(scene);
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
    invalidateReview(scene);
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
    invalidateReview(scene);
    persistDrafts();
    scheduleAutoSave(scene.id);
    render();
  }

  function selectedMask() {
    return getState().masks.find((mask) => mask.id === selectedMaskId) ?? null;
  }

  function setMode(nextMode) {
    if (drawing) cancelDrawing();
    if (nextMode !== "test") closeIncomplete();
    elements.routePacketPreview.hidden = true;
    mode = nextMode;
    document.body.dataset.editorMode = mode;
    buttonPressed(root, "[data-mode]", mode, "mode");
    render();
    const target = mode === "graph" ? root.querySelector("[data-graph-workspace]") : stage;
    motion.play(target, [{ opacity: 0.72 }, { opacity: 1 }], "fast");
  }

  function setViewport(nextViewport) {
    viewport = nextViewport;
    buttonPressed(root, "[data-viewport]", viewport, "viewport");
    render();
  }

  function setGraphScale(nextScale) {
    graphScale = clamp(nextScale, 0.55, 1.55);
    elements.graphCanvas.style.setProperty("--graph-scale", graphScale.toFixed(2));
    elements.graphScale.textContent = `${Math.round(graphScale * 100)}%`;
  }

  function sceneAncestry(scene = getCurrentScene()) {
    const ancestry = [];
    let cursor = scene;
    const visited = new Set();
    while (cursor && !visited.has(cursor.id)) {
      ancestry.push(cursor.id);
      visited.add(cursor.id);
      cursor = cursor.sourceSceneId ? scenes.get(cursor.sourceSceneId) : null;
    }
    return ancestry;
  }

  function focusCurrentGraph({ collapse = true } = {}) {
    const ancestry = new Set(sceneAncestry());
    if (collapse) {
      collapsedScenes.clear();
      for (const scene of orderedScenes) {
        if (scene.id !== world.startSceneId && !ancestry.has(scene.id)) collapsedScenes.add(scene.id);
      }
    }
    for (const sceneId of ancestry) collapsedScenes.delete(sceneId);
    renderSceneList();
    window.requestAnimationFrame(() => {
      const current = elements.sceneList.querySelector('.scene-tree-node[data-current="true"]');
      current?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    });
  }

  function collapseBranches() {
    collapsedScenes.clear();
    for (const scene of orderedScenes) {
      if (scene.id !== world.startSceneId) collapsedScenes.add(scene.id);
    }
    renderSceneList();
    elements.graphViewport.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  function expandBranches() {
    collapsedScenes.clear();
    renderSceneList();
  }

  function toggleTestMasks() {
    testMasksVisible = !testMasksVisible;
    elements.testMaskToggle.setAttribute("aria-pressed", String(testMasksVisible));
    elements.testMaskToggle.textContent = testMasksVisible ? "영역 숨기기" : "영역 보기";
    render();
  }

  function closeIncomplete() {
    incompletePath = null;
    elements.incompleteOverlay.hidden = true;
  }

  function openIncomplete(path) {
    const stagedScene = stagedBySourcePath.get(path.id);
    if (stagedScene) {
      navigateToScene(stagedScene.id);
      return;
    }
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

  function isReviewQueueScene(scene) {
    return scene.staging || scene.status === "provisional-frontier";
  }

  function reviewQueueScenes() {
    return orderedScenes.filter(isReviewQueueScene);
  }

  function annotationStatus(scene, masks = getState(scene).masks) {
    const sourceIds = new Set(masks.map((mask) => mask.sourcePathId).filter(Boolean));
    const hasNewRoutes = masks.some((mask) => !mask.sourcePathId);
    const hasRemovedRoutes = scene.paths.some((path) => !sourceIds.has(path.id));
    if (scene.staging) {
      if (reviewedScenes.has(scene.id)) return "staging-masks-confirmed";
      return masks.length ? "staging-awaiting-approval" : "awaiting-route-annotation";
    }
    if (hasNewRoutes) return "needs-route-registration";
    if (hasRemovedRoutes) return "needs-route-reconciliation";
    return reviewedScenes.has(scene.id) ? "masks-confirmed" : "awaiting-review-approval";
  }

  function completeReview() {
    const scene = getCurrentScene();
    if (!isReviewQueueScene(scene) || reviewedScenes.has(scene.id)) return;
    if (drawing || getState(scene).masks.length === 0) {
      toast("통로 마스크를 먼저 완성하세요", true);
      return;
    }
    reviewedScenes.add(scene.id);
    persistDrafts();
    scheduleAutoSave(scene.id);
    render();

    const queue = reviewQueueScenes();
    const currentIndex = queue.findIndex((candidate) => candidate.id === scene.id);
    const orderedNext = [...queue.slice(currentIndex + 1), ...queue.slice(0, currentIndex)];
    const next = orderedNext.find((candidate) => !reviewedScenes.has(candidate.id));
    if (next) {
      toast(`${scene.id} 검수 완료 · 다음 대기로 이동합니다`);
      window.setTimeout(() => navigateToScene(next.id), 240);
    } else {
      toast("현재 대기열 검수를 모두 완료했습니다");
    }
  }

  function annotationRecord(scene) {
    const masks = clone(getState(scene).masks);
    return {
      sceneId: scene.id,
      image: scene.image,
      observedVisibleRouteCount: masks.length,
      annotationStatus: annotationStatus(scene, masks),
      reviewComplete: reviewedScenes.has(scene.id),
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

  function branchChildren(scene, masks) {
    const children = [];
    const masksBySource = new Map(masks.filter((mask) => mask.sourcePathId).map((mask) => [mask.sourcePathId, mask]));
    for (const path of scene.paths) {
      const included = masksBySource.has(path.id);
      if (path.status === "active" && scenes.has(path.targetSceneId)) {
        children.push({ type: "scene", scene: scenes.get(path.targetSceneId), path, included });
      } else if (stagedBySourcePath.has(path.id)) {
        children.push({ type: "scene", scene: stagedBySourcePath.get(path.id), path, included });
      } else {
        children.push({ type: "terminal", pathId: path.id, label: "미완성 구역", state: included ? "incomplete" : "removed" });
      }
    }
    for (const mask of masks.filter((candidate) => !candidate.sourcePathId)) {
      const stagedScene = stagedBySourcePath.get(mask.id);
      if (stagedScene) children.push({ type: "scene", scene: stagedScene, path: mask, included: true });
      else children.push({ type: "terminal", pathId: mask.id, label: "새 미완성 통로", state: "incomplete" });
    }
    return children;
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

    const masks = getState(scene).masks;
    const hasIncomplete = masks.some((mask) => connectionLabel(mask, scene) === "미완성");
    const descriptors = branchChildren(scene, masks);
    const row = document.createElement("div");
    row.className = "tree-node-row";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scene-tree-node";
    button.dataset.current = String(scene.id === getCurrentScene().id);
    button.dataset.incomplete = String(hasIncomplete);
    button.dataset.staging = String(Boolean(scene.staging));
    button.dataset.reviewPending = String(isReviewQueueScene(scene) && !reviewedScenes.has(scene.id));
    button.innerHTML = `<span class="tree-node-mark"></span><span><b>${scene.id}</b><small>${scene.staging ? "후보" : `단계 ${depth}`}</small></span><em>${masks.length}</em>`;
    button.addEventListener("click", () => navigateToScene(scene.id));
    button.addEventListener("dblclick", () => {
      navigateToScene(scene.id);
      setMode("edit");
    });
    row.append(button);
    if (descriptors.length) {
      const collapsed = collapsedScenes.has(scene.id);
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "tree-branch-toggle";
      toggle.setAttribute("aria-label", `${scene.id} 가지 ${collapsed ? "펼치기" : "접기"}`);
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.textContent = collapsed ? `+${descriptors.length}` : "−";
      toggle.addEventListener("click", () => {
        if (collapsedScenes.has(scene.id)) collapsedScenes.delete(scene.id);
        else collapsedScenes.add(scene.id);
        renderSceneList();
      });
      row.append(toggle);
      item.dataset.collapsed = String(collapsed);
    }
    item.append(row);

    if (ancestry.has(scene.id) || collapsedScenes.has(scene.id)) return item;
    const nextAncestry = new Set(ancestry).add(scene.id);
    const children = document.createElement("ul");
    for (const descriptor of descriptors) {
      if (descriptor.type === "scene") {
        children.append(createSceneBranch(descriptor.scene, depth + 1, { path: descriptor.path, included: descriptor.included }, nextAncestry));
      } else {
        children.append(createTerminalNode(descriptor.pathId, descriptor.label, descriptor.state));
      }
    }
    if (children.childElementCount) item.append(children);
    return item;
  }

  function renderSceneList() {
    const query = sceneFilter.trim().toLowerCase();
    elements.sceneList.replaceChildren();
    elements.railCurrent.textContent = getCurrentScene().id;
    elements.railParent.textContent = getCurrentScene().sourceSceneId ? `부모 ${getCurrentScene().sourceSceneId}` : "시작 장면";
    const reviewScenes = reviewQueueScenes()
      .filter((scene) => !reviewedScenes.has(scene.id))
      .sort((first, second) => Number(second.staging) - Number(first.staging) || first.id.localeCompare(second.id));
    const frontierCount = orderedScenes.reduce((count, scene) => {
      return count + getState(scene).masks.filter((mask) => connectionLabel(mask, scene) === "미완성").length;
    }, 0);
    elements.graphTotal.textContent = String(orderedScenes.length);
    elements.graphFrontiers.textContent = String(frontierCount);
    elements.graphReview.textContent = String(reviewScenes.length);
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
    const packet = mask?.sourcePathId ? routePacketBySourcePath.get(mask.sourcePathId) : null;
    const incompleteCount = masks.filter((candidate) => connectionLabel(candidate, scene) === "미완성").length;
    const history = histories.get(scene.id);
    elements.routeCount.textContent = String(masks.length);
    elements.draftCount.textContent = incompleteCount ? `${incompleteCount} 미완성` : "연결 완료";
    elements.selectedId.textContent = mask?.id ?? "선택 없음";
    elements.selectedMeta.textContent = mask
      ? `${shortPathId(mask.id)} → ${connectionLabel(mask, scene)} · ${mask.regions[viewport].length}점`
      : "이미지에서 통로를 선택하세요";
    elements.deleteMask.hidden = !mask;
    elements.openRoutePacket.hidden = !packet;
    elements.openRoutePacket.dataset.status = packet?.generationStatus ?? "";
    elements.undo.disabled = history.past.length === 0;
    elements.redo.disabled = history.future.length === 0;
    const reviewable = isReviewQueueScene(scene);
    const reviewed = reviewedScenes.has(scene.id);
    const status = annotationStatus(scene, masks);
    elements.completeReview.hidden = !reviewable;
    elements.completeReview.disabled = !reviewable || reviewed || masks.length === 0 || Boolean(drawing);
    elements.completeReview.dataset.complete = String(reviewed);
    elements.completeReview.textContent = reviewed
      ? status.includes("registration") || status.includes("reconciliation")
        ? "검수 완료 · 등록 정리 필요"
        : "검수 완료됨"
      : "검수 완료";
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

  function openRoutePacketPreview() {
    const mask = selectedMask();
    const packet = mask?.sourcePathId ? routePacketBySourcePath.get(mask.sourcePathId) : null;
    if (!packet) return;
    elements.routePacketId.textContent = packet.sourcePathId;
    elements.routePacketMap.src = resolvePublicUrl(packet.references.routeMap);
    elements.routePacketCrop.src = resolvePublicUrl(packet.references.routeCrop);
    elements.routePacketRelation.textContent = packet.transitionRelation === "same-space-advance" ? "같은 공간에서 전진" : "인접 공간으로 이동";
    elements.routePacketCamera.textContent = packet.cameraTransition.instruction;
    elements.routePacketStatus.textContent = {
      ready: "생성 가능",
      consumed: "사용 완료",
      "blocked-source-geometry": "소스 형상 확인 필요",
    }[packet.generationStatus] ?? "상태 확인 필요";
    elements.routePacketStatus.dataset.status = packet.generationStatus;
    elements.routePacketPreview.hidden = false;
    motion.enterPanel(elements.routePacketPreview, "right");
  }

  function render() {
    const scene = getCurrentScene();
    if (!scene) return;
    const masks = getState(scene).masks;
    document.body.dataset.debug = String(mode === "test" && testMasksVisible);
    elements.currentScene.textContent = scene.id;
    elements.sceneDescription.textContent = scene.accessibleName;
    elements.testScene.textContent = scene.id;
    elements.parentScene.disabled = !scene.sourceSceneId;
    buttonPressed(root, "[data-mode]", mode, "mode");
    buttonPressed(root, "[data-viewport]", viewport, "viewport");
    elements.testMaskToggle.setAttribute("aria-pressed", String(testMasksVisible));
    elements.testMaskToggle.textContent = testMasksVisible ? "영역 숨기기" : "영역 보기";
    setGraphScale(graphScale);
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
    } else if (mode === "edit") {
      renderEditableOverlay(scene, masks);
    } else {
      overlay.replaceChildren();
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
        body: JSON.stringify({
          worldVersion: world.worldVersion,
          sceneId: scene.id,
          reviewComplete: reviewedScenes.has(scene.id),
          masks,
        }),
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
  root.querySelector("[data-focus-current]").addEventListener("click", () => {
    setMode("graph");
    focusCurrentGraph();
  });
  root.querySelector("[data-open-editor]").addEventListener("click", () => setMode("edit"));
  root.querySelector("[data-focus-graph]").addEventListener("click", () => focusCurrentGraph());
  root.querySelector("[data-collapse-branches]").addEventListener("click", collapseBranches);
  root.querySelector("[data-expand-branches]").addEventListener("click", expandBranches);
  root.querySelector("[data-zoom-out]").addEventListener("click", () => setGraphScale(graphScale - 0.1));
  root.querySelector("[data-zoom-in]").addEventListener("click", () => setGraphScale(graphScale + 0.1));
  elements.newMask.addEventListener("click", () => drawing ? finishDrawing() : startDrawing());
  elements.deleteMask.addEventListener("click", removeSelectedMask);
  elements.openRoutePacket.addEventListener("click", openRoutePacketPreview);
  root.querySelector("[data-close-route-packet]").addEventListener("click", () => { elements.routePacketPreview.hidden = true; });
  elements.undo.addEventListener("click", undo);
  elements.redo.addEventListener("click", redo);
  elements.completeReview.addEventListener("click", completeReview);
  elements.testMaskToggle.addEventListener("click", toggleTestMasks);
  root.querySelector("[data-export-annotations]").addEventListener("click", exportAnnotations);
  root.querySelector("[data-exit-test]").addEventListener("click", () => setMode("edit"));
  root.querySelector("[data-close-incomplete]").addEventListener("click", closeIncomplete);

  elements.graphViewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button, input")) return;
    graphDragging = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: elements.graphViewport.scrollLeft,
      top: elements.graphViewport.scrollTop,
    };
    elements.graphViewport.setPointerCapture(event.pointerId);
    elements.graphViewport.dataset.dragging = "true";
  });
  elements.graphViewport.addEventListener("pointermove", (event) => {
    if (!graphDragging || graphDragging.pointerId !== event.pointerId) return;
    elements.graphViewport.scrollLeft = graphDragging.left - (event.clientX - graphDragging.x);
    elements.graphViewport.scrollTop = graphDragging.top - (event.clientY - graphDragging.y);
  });
  elements.graphViewport.addEventListener("pointerup", (event) => {
    if (!graphDragging || graphDragging.pointerId !== event.pointerId) return;
    graphDragging = null;
    delete elements.graphViewport.dataset.dragging;
    elements.graphViewport.releasePointerCapture(event.pointerId);
  });
  elements.graphViewport.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setGraphScale(graphScale + (event.deltaY < 0 ? 0.08 : -0.08));
  }, { passive: false });

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
    } else if (event.key.toLowerCase() === "g") {
      setMode("graph");
    } else if (event.key.toLowerCase() === "e") {
      setMode("edit");
    } else if (event.key.toLowerCase() === "t") {
      setMode("test");
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

  window.requestAnimationFrame(() => {
    focusCurrentGraph({ collapse: orderedScenes.length > 120 });
  });

  return {
    render,
    sceneChanged,
    navigateToScene,
    openIncomplete,
    getMode: () => mode,
  };
}
