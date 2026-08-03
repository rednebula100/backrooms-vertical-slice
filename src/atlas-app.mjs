import { createAtlasIndex, validateAtlas } from "./world-atlas.mjs";

async function loadAtlas() {
  const candidates = [
    new URL("../world/atlas.json", import.meta.url),
    new URL("../public/world/atlas.json", import.meta.url),
  ];
  for (const source of candidates) {
    const response = await fetch(source);
    if (response.ok) return response.json();
  }
  throw new Error("World atlas failed to load from the built or development asset path");
}

const atlas = await loadAtlas();
const errors = validateAtlas(atlas);
if (errors.length) throw new Error(errors.join("\n"));

const index = createAtlasIndex(atlas);
const article = document.querySelector("[data-atlas-article]");
const indexList = document.querySelector("[data-atlas-index]");
const search = document.querySelector("[data-atlas-search]");
document.querySelector("[data-level-count]").textContent = atlas.levels.filter((level) => level.kind === "level").length;
document.querySelector("[data-sublevel-count]").textContent = atlas.levels.filter((level) => level.kind === "sublevel").length;
document.querySelector("[data-region-count]").textContent = atlas.regions.length;

let currentLevelId = new URLSearchParams(location.search).get("level");
if (!index.levels.has(currentLevelId)) currentLevelId = atlas.levels[0].id;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function statusLabel(status) {
  return {
    "in-production": "제작 중",
    skeleton: "뼈대",
    concept: "개념",
    observed: "관찰됨",
    planned: "계획",
    reserved: "경계 예약",
  }[status] ?? status;
}

function originLabel(origin) {
  return { hybrid: "독자 혼합", reinterpretation: "재해석", original: "독자 공간" }[origin] ?? origin;
}

function renderIndex(query = "") {
  const needle = query.trim().toLowerCase();
  indexList.replaceChildren();
  for (const level of atlas.levels) {
    const haystack = `${level.number} ${level.title} ${level.summary}`.toLowerCase();
    if (needle && !haystack.includes(needle)) continue;
    const item = document.createElement("li");
    item.dataset.child = String(level.kind === "sublevel");
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-current", level.id === currentLevelId ? "page" : "false");
    button.innerHTML = `<b>${escapeHtml(level.number)}</b><span>${escapeHtml(level.title)}</span><em>${escapeHtml(statusLabel(level.status))}</em>`;
    button.addEventListener("click", () => selectLevel(level.id));
    item.append(button);
    indexList.append(item);
  }
}

function renderRules(rules, className = "") {
  return `<ul class="rule-list ${className}">${rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul>`;
}

function renderRegions(level) {
  const regions = index.regionsByLevel.get(level.id) ?? [];
  if (!regions.length) return '<p class="empty-note">등록된 내부 지역이 없다.</p>';
  return `<div class="region-list">${regions.map((region) => `
    <section class="region-row">
      <header><b>${escapeHtml(region.title)}</b><small>${escapeHtml(statusLabel(region.status))} · ${escapeHtml(region.id)}</small></header>
      <div><p>${escapeHtml(region.summary)}</p><ul>${region.grammar.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
    </section>`).join("")}</div>`;
}

function renderConnections(level) {
  const connections = index.connectionsByLevel.get(level.id) ?? [];
  if (!connections.length) return '<p class="empty-note">아직 연결 후보가 없다.</p>';
  return `<div class="connection-list">${connections.map((connection) => {
    const otherId = connection.relation === "outgoing" ? connection.toLevelId : connection.fromLevelId;
    const other = index.levels.get(otherId);
    return `<a class="connection-row" href="?level=${encodeURIComponent(otherId)}">
      <span>${connection.relation === "outgoing" ? "나가는 길 →" : "← 들어오는 길"}</span>
      <div><b>Level ${escapeHtml(other.number)} · ${escapeHtml(other.title)}</b><p>${escapeHtml(connection.summary)}</p></div>
      <em>${escapeHtml(statusLabel(connection.status))}</em>
    </a>`;
  }).join("")}</div>`;
}

function renderSources(level) {
  if (!level.sourceUrls.length) return '<p class="empty-note">독자 공간. 외부 원전 없음.</p>';
  return `<div class="source-list">${level.sourceUrls.map((url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">공식 위키 참고 페이지 ↗</a>`).join("")}</div>`;
}

function renderArticle() {
  const level = index.levels.get(currentLevelId);
  const parent = level.parentLevelId ? index.levels.get(level.parentLevelId) : null;
  const childCount = level.sublevelIds.length;
  article.innerHTML = `
    <div class="article-kicker">
      <span>${escapeHtml(level.kind === "level" ? "LEVEL" : "SUBLEVEL")}</span>
      <span>${escapeHtml(originLabel(level.origin))}</span>
      <span>${escapeHtml(statusLabel(level.status))}</span>
      ${parent ? `<span>부모: Level ${escapeHtml(parent.number)}</span>` : ""}
      ${childCount ? `<span>세부레벨 ${childCount}</span>` : ""}
    </div>
    <h1><small>LEVEL ${escapeHtml(level.number)}</small>${escapeHtml(level.title)}</h1>
    <p class="article-summary">${escapeHtml(level.summary)}</p>
    <hr class="article-rule" />
    <section class="article-section"><h2>핵심 정체성</h2><p class="identity">${escapeHtml(level.coreIdentity)}</p></section>
    <section class="article-section"><h2>공간 DNA</h2>${renderRules(level.spatialDNA)}</section>
    <section class="article-section"><h2>드리프트 금지</h2>${renderRules(level.forbiddenDrift, "forbidden")}</section>
    <section class="article-section"><h2>내부 지역</h2>${renderRegions(level)}</section>
    <section class="article-section"><h2>연결 후보</h2>${renderConnections(level)}</section>
    <section class="article-section"><h2>참고 기준</h2>${renderSources(level)}</section>`;
  article.focus({ preventScroll: true });
}

function selectLevel(levelId) {
  if (!index.levels.has(levelId)) return;
  currentLevelId = levelId;
  const url = new URL(location.href);
  url.searchParams.set("level", levelId);
  history.pushState({ levelId }, "", url);
  renderIndex(search.value);
  renderArticle();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

search.addEventListener("input", () => renderIndex(search.value));
window.addEventListener("popstate", () => {
  const levelId = new URLSearchParams(location.search).get("level");
  if (index.levels.has(levelId)) currentLevelId = levelId;
  renderIndex(search.value);
  renderArticle();
});

renderIndex();
renderArticle();
