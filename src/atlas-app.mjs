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

function readinessLabel(status) {
  return {
    "specified-not-produced": "사양 고정 · 이미지 미제작",
    "pilot-in-production": "파일럿 제작 중",
    "candidate-awaiting-human-mask": "후보 생성 · 통로 검수 대기",
    "candidate-reviewed-promotion-deferred": "통로 검수 완료 · 파일럿 승격 보류",
    "specified-not-active": "사양 고정 · 비활성",
  }[status] ?? status;
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
  if (level.productionSpec) {
    rows.splice(6, 0,
      ["제작 사양", readinessLabel(level.productionSpec.readiness)],
      ["파일럿", `${level.productionSpec.pilotSceneCount}장`]);
  }
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

function renderProductionSpec(level) {
  const spec = level.productionSpec;
  if (!spec) return "";
  const policyRows = [
    ["마스크 순서", spec.routePolicy.annotationOrder],
    ["기본 경로 수", spec.routePolicy.defaultVisibleRoutes],
    ["3개 경로", spec.routePolicy.threeRouteUse],
    ["4개 이상", spec.routePolicy.fourPlusUse],
  ];
  return `<section class="article-chapter production-spec" id="production-spec">
    <header><span>08</span><h2>제작 사양</h2></header>
    <div class="spec-lede"><span>${escapeHtml(readinessLabel(spec.readiness))} · SPEC ${escapeHtml(spec.specVersion)}</span><p>${escapeHtml(spec.pilotObjective)}</p></div>
    <section class="article-section"><h3>${escapeHtml(spec.pilotSceneCount)}장 파일럿 흐름</h3>
      <ol class="pilot-beats">${spec.pilotBeats.map((beat, beatIndex) => `<li data-production-state="${escapeHtml(beat.status ?? "planned")}"><span>${String(beatIndex + 1).padStart(2, "0")} · ${escapeHtml(beat.id)}</span><b>${escapeHtml(beat.title)}</b><p>${escapeHtml(beat.purpose)}</p><small>${escapeHtml(beat.topologyIntent)}</small>${beat.candidateSceneId ? `<a class="pilot-beat-status" href="./?dev=1&amp;scene=${escapeHtml(beat.candidateSceneId)}">${escapeHtml(readinessLabel(beat.status))}<b>${escapeHtml(beat.candidateSceneId)} 편집</b></a>` : ""}</li>`).join("")}</ol>
    </section>
    <section class="article-section"><h3>대표 공간 5종</h3>
      <div class="signature-spaces">${spec.signatureSpaces.map((space) => `<article><span>${escapeHtml(space.id)}</span><h4>${escapeHtml(space.title)}</h4><p>${escapeHtml(space.role)}</p><div><b>필수 단서</b><ul>${space.requiredCues.map((cue) => `<li>${escapeHtml(cue)}</li>`).join("")}</ul></div><div><b>금지</b><ul>${space.forbiddenCues.map((cue) => `<li>${escapeHtml(cue)}</li>`).join("")}</ul></div></article>`).join("")}</div>
    </section>
    <section class="article-section"><h3>변형 축</h3>
      <div class="variation-table">${spec.variationAxes.map((axis) => `<div><b>${escapeHtml(axis.axis)}</b><span>${escapeHtml(axis.low)}</span><i>→</i><span>${escapeHtml(axis.high)}</span><small>${escapeHtml(axis.control)}</small></div>`).join("")}</div>
    </section>
    <div class="wiki-columns spec-columns">
      <section class="article-section"><h3>카메라 문법</h3>${renderRules(spec.cameraGrammar)}</section>
      <section class="article-section"><h3>이미지 프롬프트 규칙</h3>${renderRules(spec.imagePromptRules)}</section>
    </div>
    <section class="article-section"><h3>통로 판독 정책</h3>
      <dl class="route-policy">${policyRows.map(([term, value]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>
      <div class="wiki-columns policy-notes"><p><b>보행 경로</b>${escapeHtml(spec.routePolicy.walkableRouteRule)}</p><p><b>배경 구조</b>${escapeHtml(spec.routePolicy.falseRouteRule)}</p></div>
    </section>
    <section class="article-section"><h3>연속성 규칙</h3>${renderRules(spec.continuityRules)}</section>
    <section class="article-section"><h3>파일럿 통과 기준</h3>${renderRules(spec.acceptanceCriteria, "acceptance")}</section>
  </section>`;
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

function renderBoundaryContract(connection) {
  const contract = connection.boundaryContract;
  if (!contract) return "";
  const camera = contract.cameraContract;
  return `<details class="boundary-contract" open>
    <summary><span>BOUNDARY CONTRACT ${escapeHtml(contract.contractVersion)}</span><b>${escapeHtml(readinessLabel(contract.readiness))}</b><em>도착 예정 ${escapeHtml(contract.plannedArrivalSceneId)}</em></summary>
    <div class="boundary-contract-body">
      <section><h4>세 단계 전환</h4><ol class="transition-beats">${contract.transitionBeats.map((beat) => `<li><span>${escapeHtml(beat.step)}</span><p>${escapeHtml(beat.rule)}</p></li>`).join("")}</ol></section>
      <section><h4>재료 연속성</h4><div class="material-continuity">${contract.materialContinuity.map((item) => `<div><b>${escapeHtml(item.from)}</b><i>→</i><b>${escapeHtml(item.to)}</b><p>${escapeHtml(item.rule)}</p></div>`).join("")}</div></section>
      <section><h4>카메라 계약</h4><dl class="camera-contract"><div><dt>높이</dt><dd>${escapeHtml(camera.heightMeters)}m ± ${escapeHtml(camera.heightToleranceMeters)}m</dd></div><div><dt>렌즈</dt><dd>${escapeHtml(camera.lensEquivalentMm)}mm · 허용 ${escapeHtml(camera.lensRangeMm.join("–"))}mm</dd></div><div><dt>회전</dt><dd>${escapeHtml(camera.turnRule)}</dd></div><div><dt>폭</dt><dd>${escapeHtml(camera.widthRule)}</dd></div><div><dt>수평선</dt><dd>${escapeHtml(camera.horizonRule)}</dd></div></dl></section>
      <div class="wiki-columns boundary-columns"><section><h4>상호작용 계약</h4>${renderRules(contract.interactionContract)}</section><section><h4>활성화 게이트</h4>${renderRules(contract.activationGates, "acceptance")}</section></div>
    </div>
  </details>`;
}

function renderConnections(level) {
  const connections = index.connectionsByLevel.get(level.id) ?? [];
  if (!connections.length) return '<p class="empty-note">아직 연결 후보가 없다.</p>';
  return `<div class="connection-list">${connections.map((connection) => {
    const otherId = connection.relation === "outgoing" ? connection.toLevelId : connection.fromLevelId;
    const other = index.levels.get(otherId);
    return `<section class="connection-card"><a class="connection-row" href="${escapeHtml(levelUrl(otherId))}" data-level-link="${escapeHtml(otherId)}">
        <span>${connection.relation === "outgoing" ? "나가는 길 →" : "← 들어오는 길"}</span>
        <div><b>Level ${escapeHtml(other.number)} · ${escapeHtml(other.title)}</b><p>${escapeHtml(connection.summary)}</p></div>
        <em>${escapeHtml(statusLabel(connection.status))}</em>
      </a>${renderBoundaryContract(connection)}</section>`;
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
      ${level.productionSpec ? '<a href="#production-spec">제작 사양</a>' : ""}
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

    ${renderProductionSpec(level)}
    <section class="article-chapter" id="canon-notes">
      <header><span>${level.productionSpec ? "09" : "08"}</span><h2>캐논 메모</h2></header>
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
