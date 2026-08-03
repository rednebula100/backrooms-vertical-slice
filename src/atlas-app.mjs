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
const filterButtons = [...document.querySelectorAll("[data-atlas-filter]")];
const indexPanel = document.querySelector("[data-atlas-index-panel]");
const indexToggle = document.querySelector("[data-index-toggle]");
const lightbox = document.querySelector("[data-atlas-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxCaption = document.querySelector("[data-lightbox-caption]");
document.querySelector("[data-level-count]").textContent = atlas.levels.filter((level) => level.kind === "level").length;
document.querySelector("[data-sublevel-count]").textContent = atlas.levels.filter((level) => level.kind === "sublevel").length;
document.querySelector("[data-region-count]").textContent = atlas.regions.length;

let currentLevelId = new URLSearchParams(location.search).get("level");
if (!index.levels.has(currentLevelId)) currentLevelId = atlas.levels[0].id;
let currentFilter = "all";

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

function imageStatusLabel(status) {
  return { observed: "실제 승인 장면", concept: "설정 컨셉" }[status] ?? status;
}

function levelUrl(levelId) {
  const url = new URL(location.href);
  url.searchParams.set("level", levelId);
  return `${url.pathname}${url.search}`;
}

function renderIndex(query = "") {
  const needle = query.trim().toLowerCase();
  indexList.replaceChildren();
  for (const level of atlas.levels) {
    if (currentFilter !== "all" && level.kind !== currentFilter) continue;
    const regionText = (index.regionsByLevel.get(level.id) ?? []).map((region) => `${region.title} ${region.summary}`).join(" ");
    const haystack = [
      level.number,
      level.title,
      level.summary,
      level.coreIdentity,
      level.classification.primaryRisk,
      ...(level.keywords ?? []),
      regionText,
    ].join(" ").toLowerCase();
    if (needle && !haystack.includes(needle)) continue;
    const item = document.createElement("li");
    item.dataset.child = String(level.kind === "sublevel");
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-current", level.id === currentLevelId ? "page" : "false");
    button.innerHTML = `<b>${escapeHtml(level.number)}</b><span>${escapeHtml(level.title)}<small>${escapeHtml(level.classification.primaryRisk)}</small></span><em>${escapeHtml(statusLabel(level.status))}<i data-image-status="${escapeHtml(level.representativeImage.status)}" title="${escapeHtml(imageStatusLabel(level.representativeImage.status))}"></i></em>`;
    button.addEventListener("click", () => selectLevel(level.id));
    item.append(button);
    indexList.append(item);
  }
}

function renderRules(rules, className = "") {
  return `<ul class="rule-list ${className}">${rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul>`;
}

function renderInfobox(level, parent) {
  const regions = index.regionsByLevel.get(level.id) ?? [];
  const connections = index.connectionsByLevel.get(level.id) ?? [];
  const rows = [
    ["문서 ID", level.id],
    ["분류", level.kind === "level" ? "부모 레벨" : "세부레벨"],
    ["부모", parent ? `Level ${parent.number} — ${parent.title}` : "—"],
    ["설정 상태", statusLabel(level.status)],
    ["기원", originLabel(level.origin)],
    ["대표 이미지", imageStatusLabel(level.representativeImage.status)],
    ["공간 규모", level.classification.scale],
    ["길찾기 난도", level.classification.navigability],
    ["환경 압박", level.classification.environmentalPressure],
    ["주 위험", level.classification.primaryRisk],
    ["내부 지역", `${regions.length}개`],
    ["연결 후보", `${connections.length}개`],
    ["미확정", `${level.openQuestions.length}개`],
    ["아틀라스 개정", `v${atlas.atlasVersion} · ${atlas.lastUpdated}`],
  ];
  return `<aside class="atlas-infobox" aria-label="Level ${escapeHtml(level.number)} 문서 정보">
    <h2>문서 정보</h2>
    <dl>${rows.map(([term, value]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>
  </aside>`;
}

function renderSensoryProfile(level) {
  return `<div class="sensory-grid">${level.sensoryProfile.map((item) => {
    const [label, ...detail] = item.split(" — ");
    return `<div><b>${escapeHtml(label)}</b><p>${escapeHtml(detail.join(" — "))}</p></div>`;
  }).join("")}</div>`;
}

function renderExperienceArc(level) {
  return `<ol class="experience-arc">${level.experienceArc.map((item) => {
    const [label, ...detail] = item.split(" — ");
    return `<li><span>${escapeHtml(label)}</span><p>${escapeHtml(detail.join(" — "))}</p></li>`;
  }).join("")}</ol>`;
}

function renderFamily(level) {
  const family = [];
  if (level.parentLevelId) {
    const parent = index.levels.get(level.parentLevelId);
    family.push({ label: "부모 레벨", level: parent });
  }
  for (const childId of level.sublevelIds) family.push({ label: "세부레벨", level: index.levels.get(childId) });
  if (!family.length) return '<p class="empty-note">등록된 부모·세부레벨 관계가 없다.</p>';
  return `<div class="family-list">${family.map(({ label, level: related }) => `<a href="${escapeHtml(levelUrl(related.id))}" data-level-link="${escapeHtml(related.id)}"><span>${escapeHtml(label)}</span><b>Level ${escapeHtml(related.number)} — ${escapeHtml(related.title)}</b><p>${escapeHtml(related.coreIdentity)}</p></a>`).join("")}</div>`;
}

function renderPager(level) {
  const currentIndex = atlas.levels.findIndex((item) => item.id === level.id);
  const previous = atlas.levels[currentIndex - 1] ?? null;
  const next = atlas.levels[currentIndex + 1] ?? null;
  const link = (item, direction) => item
    ? `<a href="${escapeHtml(levelUrl(item.id))}" data-level-link="${escapeHtml(item.id)}"><span>${direction}</span><b>Level ${escapeHtml(item.number)} — ${escapeHtml(item.title)}</b></a>`
    : `<span class="pager-empty"></span>`;
  return `<nav class="article-pager" aria-label="이전 및 다음 항목">${link(previous, "← 이전 항목")}${link(next, "다음 항목 →")}</nav>`;
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
    return `<a class="connection-row" href="${escapeHtml(levelUrl(otherId))}" data-level-link="${escapeHtml(otherId)}">
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
  const image = level.representativeImage;
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
    <div class="article-reference-grid">
      <figure class="atlas-cover" data-image-status="${escapeHtml(image.status)}">
        <button type="button" class="cover-open" data-cover-open aria-label="Level ${escapeHtml(level.number)} 대표 이미지 크게 보기">
          <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" decoding="async" fetchpriority="high" />
        </button>
        <figcaption>
          <span>${escapeHtml(image.label)}</span>
          <p>${escapeHtml(image.caption)}</p>
          <small>${escapeHtml(image.canonScope)}</small>
        </figcaption>
      </figure>
      ${renderInfobox(level, parent)}
    </div>
    <nav class="article-toc" aria-label="이 문서의 목차">
      <span>이 문서에서</span>
      <a href="#overview">개요</a>
      <a href="#structure">구조</a>
      <a href="#experience">체험</a>
      <a href="#phenomena">현상·위험</a>
      <a href="#regions">지역</a>
      <a href="#routes">입출구</a>
      <a href="#relations">관계</a>
      <a href="#canon-notes">캐논 메모</a>
    </nav>

    <section class="article-chapter" id="overview">
      <header><span>01</span><h2>개요</h2></header>
      <p class="identity">${escapeHtml(level.coreIdentity)}</p>
      <div class="chapter-prose"><h3>세계 안에서의 역할</h3><p>${escapeHtml(level.narrativeFunction)}</p></div>
    </section>

    <section class="article-chapter" id="structure">
      <header><span>02</span><h2>공간 구조</h2></header>
      <div class="chapter-prose lead"><p>${escapeHtml(level.spatialStructure)}</p></div>
      <div class="wiki-columns">
        <section class="article-section"><h3>공간 DNA</h3>${renderRules(level.spatialDNA)}</section>
        <section class="article-section"><h3>환경 법칙</h3>${renderRules(level.environmentalRules)}</section>
      </div>
    </section>

    <section class="article-chapter" id="experience">
      <header><span>03</span><h2>감각과 체험 흐름</h2></header>
      ${renderSensoryProfile(level)}
      ${renderExperienceArc(level)}
    </section>

    <section class="article-chapter" id="phenomena">
      <header><span>04</span><h2>현상과 위험</h2></header>
      <div class="wiki-columns">
        <section class="article-section"><h3>고정 현상</h3>${renderRules(level.phenomena)}</section>
        <section class="article-section"><h3>실제 위험</h3>${renderRules(level.hazards, "hazard")}</section>
      </div>
    </section>

    <section class="article-chapter" id="regions">
      <header><span>05</span><h2>내부 지역</h2></header>
      ${renderRegions(level)}
    </section>

    <section class="article-chapter" id="routes">
      <header><span>06</span><h2>입구와 출구</h2></header>
      <div class="wiki-columns">
        <section class="article-section"><h3>입구</h3>${renderRules(level.entrances, "passage")}</section>
        <section class="article-section"><h3>출구</h3>${renderRules(level.exits, "passage")}</section>
      </div>
    </section>

    <section class="article-chapter" id="relations">
      <header><span>07</span><h2>세계 관계</h2></header>
      <section class="article-section"><h3>부모·세부레벨</h3>${renderFamily(level)}</section>
      <section class="article-section"><h3>연결 후보</h3>${renderConnections(level)}</section>
    </section>

    <section class="article-chapter" id="canon-notes">
      <header><span>08</span><h2>캐논 메모</h2></header>
      <div class="wiki-columns">
        <section class="article-section"><h3>드리프트 금지</h3>${renderRules(level.forbiddenDrift, "forbidden")}</section>
        <section class="article-section"><h3>미확정 질문</h3>${renderRules(level.openQuestions, "questions")}</section>
      </div>
      <section class="article-section source-section"><h3>참고 기준</h3>${renderSources(level)}</section>
    </section>
    ${renderPager(level)}`;
  article.querySelector("[data-cover-open]").addEventListener("click", () => {
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = image.caption;
    lightbox.showModal();
  });
  for (const link of article.querySelectorAll("[data-level-link]")) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      selectLevel(link.dataset.levelLink);
    });
  }
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
  if (matchMedia("(max-width: 820px)").matches) {
    indexPanel.dataset.collapsed = "true";
    indexToggle.setAttribute("aria-expanded", "false");
    indexToggle.textContent = "목차 펼치기";
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

search.addEventListener("input", () => renderIndex(search.value));
indexToggle.addEventListener("click", () => {
  const collapsed = indexPanel.dataset.collapsed === "true";
  indexPanel.dataset.collapsed = String(!collapsed);
  indexToggle.setAttribute("aria-expanded", String(collapsed));
  indexToggle.textContent = collapsed ? "목차 접기" : "목차 펼치기";
});
for (const button of filterButtons) {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.atlasFilter;
    for (const item of filterButtons) item.setAttribute("aria-pressed", String(item === button));
    renderIndex(search.value);
  });
}
document.querySelector("[data-lightbox-close]").addEventListener("click", () => lightbox.close());
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});
window.addEventListener("popstate", () => {
  const levelId = new URLSearchParams(location.search).get("level");
  if (index.levels.has(levelId)) currentLevelId = levelId;
  renderIndex(search.value);
  renderArticle();
});

renderIndex();
renderArticle();
