"use strict";

// ---- 상태 ----
let BOOKS = [];        // books.json
let ENTRIES = [];      // entries.json
let TOC = [];          // toc.json (책별 목차)
const TEXT = {};       // book_id -> [page strings], 지연 로딩
let viewerState = null; // { book, pages:[...], idx }

const $ = (s) => document.querySelector(s);
const qEl = $("#q"), resultsEl = $("#results"), entriesEl = $("#entries"),
      hintEl = $("#hint"), browseEl = $("#browse");

// ---- 초기 로딩 ----
Promise.all([
  fetch("data/books.json").then(r => r.json()),
  fetch("entries.json").then(r => r.json()),
  fetch("data/toc.json").then(r => r.json()),
]).then(([books, entries, toc]) => {
  BOOKS = books; ENTRIES = entries; TOC = toc;
  renderBrowse();
  showHome();
}).catch(() => { hintEl.textContent = "데이터를 불러오지 못했습니다."; });

// 백과 항목 커리큘럼 분류 (스터디 진도 순)
const CATS = [
  ["꿀벌 이해", ["colony-society", "bee-ecology", "bee-races"]],
  ["봉군 기초·관리", ["apiary-setup", "colony-inspection", "feeding"]],
  ["계절 관리", ["spring-buildup", "summer-management", "autumn-winterbee", "wintering", "annual-calendar"]],
  ["여왕벌·번식", ["queen-grafting", "swarming"]],
  ["병해충 방제", ["mite-control", "bee-diseases", "hornet-control"]],
  ["밀원·화분매개", ["nectar-plants", "pollination"]],
  ["양봉 산물·안전", ["honey-harvest", "hive-products", "product-safety"]],
];
const entryById = (id) => ENTRIES.find(e => e.id === id);

// 백과 항목 색인 HTML (분류별 클릭 목록)
function entryIndexHtml() {
  const seen = new Set();
  let html = "";
  CATS.forEach(([cat, ids]) => {
    const items = ids.map(entryById).filter(Boolean);
    items.forEach(e => seen.add(e.id));
    if (!items.length) return;
    html += `<div class="idx-group"><h4>${escapeHtml(cat)}</h4><ul>`;
    items.forEach(e => {
      html += `<li><button class="idx-item" data-id="${e.id}">${escapeHtml(e.title)}</button></li>`;
    });
    html += `</ul></div>`;
  });
  // 분류에 안 든 항목은 '기타'로
  const rest = ENTRIES.filter(e => !seen.has(e.id));
  if (rest.length) {
    html += `<div class="idx-group"><h4>기타</h4><ul>`;
    rest.forEach(e => { html += `<li><button class="idx-item" data-id="${e.id}">${escapeHtml(e.title)}</button></li>`; });
    html += `</ul></div>`;
  }
  return html;
}
function wireIndex(root) {
  root.querySelectorAll(".idx-item").forEach(b =>
    b.addEventListener("click", () => showEntry(b.dataset.id)));
}

// 홈 화면: 백과 항목 색인
function showHome() {
  qEl.value = ""; $("#clear").hidden = true;
  hintEl.hidden = true; resultsEl.innerHTML = "";
  entriesEl.innerHTML = `<div class="index"><h2 class="browse-h">📚 백과 항목 <span>주제를 눌러 펼쳐 보기 · ${ENTRIES.length}개</span></h2>${entryIndexHtml()}</div>`;
  wireIndex(entriesEl);
  window.scrollTo(0, 0);
}

// 단일 항목 펼치기 (+ 목록으로 돌아가기)
function showEntry(id) {
  const e = entryById(id);
  if (!e) return;
  qEl.value = ""; $("#clear").hidden = true;
  hintEl.hidden = true; resultsEl.innerHTML = ""; entriesEl.innerHTML = "";
  const back = document.createElement("button");
  back.className = "back-btn";
  back.textContent = "← 백과 항목 목록";
  back.addEventListener("click", showHome);
  entriesEl.appendChild(back);
  entriesEl.appendChild(renderEntry(e));
  window.scrollTo(0, 0);
}

const bookById = (id) => BOOKS.find(b => b.id === id) || { title: id, searchable: false };

// 검색 대상 책 텍스트를 필요할 때 로딩
async function ensureText(id) {
  if (TEXT[id]) return TEXT[id];
  const r = await fetch(`data/${encodeURIComponent(id)}.json`);
  TEXT[id] = await r.json();
  return TEXT[id];
}

// ---- 검색 ----
let searchToken = 0;
async function search(query) {
  const q = query.trim();
  entriesEl.innerHTML = "";
  resultsEl.innerHTML = "";
  if (!q) { hintEl.hidden = false; showHome(); return; }
  hintEl.hidden = true;
  const token = ++searchToken;

  // 1) 정리된 백과 항목 매칭 → 접힌 링크로 간단히 (누르면 펼침)
  const matchedEntries = ENTRIES.filter(e =>
    e.title.includes(q) || e.summary.includes(q) ||
    e.tags.some(t => t.includes(q) || q.includes(t))
  );
  if (matchedEntries.length) {
    let h = `<h3 class="res-h">📚 관련 백과 항목 ${matchedEntries.length}개 <span>눌러서 펼쳐 보기</span></h3><div class="idx-group"><ul>`;
    matchedEntries.forEach(e => {
      h += `<li><button class="idx-item" data-id="${e.id}">${escapeHtml(e.title)}</button></li>`;
    });
    h += `</ul></div>`;
    entriesEl.innerHTML = h;
    wireIndex(entriesEl);
  }

  // 2) 원문(PDF) 전문 검색 — 그 단어가 나온 모든 쪽
  const searchable = BOOKS.filter(b => b.searchable);
  let hits = 0;
  resultsEl.innerHTML = '<p class="hint">원문에서 찾는 중…</p>';
  const frag = document.createDocumentFragment();
  for (const b of searchable) {
    const pages = await ensureText(b.id);
    if (token !== searchToken) return; // 새 검색이 시작됨
    pages.forEach((text, i) => {
      const pos = text.indexOf(q);
      if (pos === -1) return;
      hits++;
      frag.appendChild(renderResult(b, i + 1, text, pos, q));
    });
  }
  if (token !== searchToken) return;
  resultsEl.innerHTML = "";
  const rh = document.createElement("h3");
  rh.className = "res-h";
  rh.innerHTML = `📄 원문(PDF)에서 찾기 · ${hits}건 <span>양봉 자료 원문에서 '${escapeHtml(q)}'이(가) 나온 쪽</span>`;
  resultsEl.appendChild(rh);
  if (hits) resultsEl.appendChild(frag);
  else resultsEl.insertAdjacentHTML("beforeend",
    `<div class="empty">원문에서 '${escapeHtml(q)}'을(를) 찾지 못했어요.<br>다른 단어로 찾아보세요.</div>`);

  // 스캔본 안내
  const scan = BOOKS.filter(b => !b.searchable);
  if (scan.length) {
    const note = document.createElement("div");
    note.className = "scan-note";
    note.textContent = `※ 스캔 문서 ${scan.length}권(${scan.map(b => b.title).join(", ")})은 원문 검색이 안 됩니다. 왼쪽 '전체 목차'에서 원본 보기는 가능합니다.`;
    resultsEl.appendChild(note);
  }
}

// ---- 렌더: 전체 목차 브라우즈 ----
function renderBrowse() {
  if (!TOC.length) return;
  const total = TOC.reduce((n, b) => n + b.sections.length, 0);
  let html = `<h2 class="browse-h">📖 전체 목차 <span>주제를 눌러 원본 페이지로 이동 · 항목 ${total}개</span></h2>`;
  TOC.forEach((b, bi) => {
    html += `<details class="book"${bi === 0 ? " open" : ""}><summary>${escapeHtml(b.title)}` +
      `${b.searchable ? "" : ' <em class="scan">스캔본</em>'}</summary><ul>`;
    b.sections.forEach(s => {
      html += `<li class="lv${Math.min(s.level, 3)}"><button data-book="${b.id}" data-page="${s.page}">` +
        `${escapeHtml(s.title)}<span>${s.page}쪽</span></button></li>`;
    });
    html += `</ul></details>`;
  });
  browseEl.innerHTML = html;
  browseEl.querySelectorAll("button[data-book]").forEach(btn => {
    btn.addEventListener("click", () =>
      openBook(btn.dataset.book, Number(btn.dataset.page)));
  });
}

// ---- 렌더: 백과 항목 ----
function renderEntry(e) {
  const el = document.createElement("article");
  el.className = "card";
  let html = `<span class="entry-badge">백과 항목</span>
    <h2>${escapeHtml(e.title)}</h2>
    <p class="summary">${escapeHtml(e.summary)}</p>`;

  // 핵심 포인트·수치 (선택)
  if (e.facts) {
    html += `<h3>${escapeHtml(e.facts.title)}</h3><ul class="facts">`;
    e.facts.items.forEach(t => { html += `<li>${escapeHtml(t)}</li>`; });
    html += `</ul>`;
  }

  if (e.calendar) {
    html += `<h3>${escapeHtml(e.calendar.title)}</h3><table><thead><tr><th>시기</th><th>할 일</th></tr></thead><tbody>`;
    e.calendar.rows.forEach(r => {
      html += `<tr><td>${escapeHtml(r.period)}</td><td>${escapeHtml(r.task)}</td></tr>`;
    });
    html += `</tbody></table>`;
    if (e.calendar.note) html += `<p class="tbl-note">${escapeHtml(e.calendar.note)}</p>`;
  }

  // 비교표 (선택, 다중 열): { title, cols:[], rows:[[]], note }
  if (e.tables) {
    e.tables.forEach(t => {
      html += `<h3>${escapeHtml(t.title)}</h3><div class="tbl-scroll"><table><thead><tr>`;
      t.cols.forEach(c => { html += `<th>${escapeHtml(c)}</th>`; });
      html += `</tr></thead><tbody>`;
      t.rows.forEach(row => {
        html += `<tr>` + row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("") + `</tr>`;
      });
      html += `</tbody></table></div>`;
      if (t.note) html += `<p class="tbl-note">${escapeHtml(t.note)}</p>`;
    });
  }

  if (e.steps) {
    html += `<h3>${escapeHtml(e.steps.title)}</h3><ol class="steps">`;
    e.steps.items.forEach(s => {
      html += `<li><b>${escapeHtml(s.step)}</b><span>${escapeHtml(s.detail)}</span></li>`;
    });
    html += `</ol>`;
  }

  if (e.sources && e.sources.length) {
    // 원본 교재 페이지 썸네일 (그림·도표 포함) — 눌러서 크게 보기
    const thumbs = [];
    e.sources.forEach(s => s.pages.forEach(p => thumbs.push([s.book, p])));
    const shown = thumbs.slice(0, 10);
    if (shown.length) {
      html += `<h3>📷 원본 자료 <span class="h3-note">교재 원본 페이지 · 눌러서 크게 보기</span></h3><div class="thumbs">`;
      shown.forEach(([book, p]) => {
        html += `<button class="thumb" data-book="${book}" data-page="${p}">` +
          `<img loading="lazy" src="pages/${encodeURIComponent(book)}/${p}.webp" alt="${p}쪽">` +
          `<span>${p}쪽</span></button>`;
      });
      if (thumbs.length > shown.length) html += `<div class="thumb-more">+${thumbs.length - shown.length}쪽<br>출처 참고</div>`;
      html += `</div>`;
    }

    html += `<div class="sources"><span class="lbl">출처 원본 보기:</span>`;
    e.sources.forEach(s => {
      html += `<button class="src-btn" data-book="${s.book}" data-pages="${s.pages.join(',')}">${escapeHtml(s.title)} p.${s.pages[0]}${s.pages.length > 1 ? '~' : ''}</button>`;
    });
    html += `</div>`;
  }
  el.innerHTML = html;
  el.querySelectorAll(".thumb").forEach(btn => {
    btn.addEventListener("click", () => openBook(btn.dataset.book, Number(btn.dataset.page)));
  });
  el.querySelectorAll(".src-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const pages = btn.dataset.pages.split(",").map(Number);
      openBook(btn.dataset.book, pages[0]);
    });
  });
  return el;
}

// ---- 렌더: 검색 결과 ----
function renderResult(book, pageNo, text, pos, q) {
  const el = document.createElement("article");
  el.className = "card result";
  const start = Math.max(0, pos - 40);
  const end = Math.min(text.length, pos + q.length + 90);
  const before = escapeHtml((start > 0 ? "…" : "") + text.slice(start, pos));
  const hit = escapeHtml(text.slice(pos, pos + q.length));
  const after = escapeHtml(text.slice(pos + q.length, end) + (end < text.length ? "…" : ""));
  el.innerHTML = `<div class="meta">${escapeHtml(book.title)} · ${pageNo}쪽</div>
    <div class="snippet">${before}<mark>${hit}</mark>${after}</div>`;
  el.addEventListener("click", () => openBook(book.id, pageNo));
  return el;
}

// ---- 원본 뷰어 ----
// 책 전체를 넘겨 볼 수 있게, 시작 쪽만 지정해 연다
function openBook(bookId, startPage) {
  const b = bookById(bookId);
  const total = b.pages || startPage;
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  const idx = Math.min(Math.max(startPage - 1, 0), pages.length - 1);
  openViewer(bookId, pages, idx);
}
function openViewer(bookId, pages, idx) {
  viewerState = { book: bookId, pages, idx };
  $("#viewer").hidden = false;
  document.body.style.overflow = "hidden";
  showPage();
}
function showPage() {
  const { book, pages, idx } = viewerState;
  const b = bookById(book);
  $("#viewer-title").textContent = b.title;
  $("#viewer-img").src = `pages/${book}/${pages[idx]}.webp`;
  $("#page-label").textContent = `${pages[idx]}쪽 (${idx + 1}/${pages.length})`;
  $("#prev").disabled = idx === 0;
  $("#next").disabled = idx === pages.length - 1;
  $("#viewer-body")?.scrollTo?.(0, 0);
}
$("#prev").addEventListener("click", () => { viewerState.idx--; showPage(); });
$("#next").addEventListener("click", () => { viewerState.idx++; showPage(); });
$("#viewer-close").addEventListener("click", () => {
  $("#viewer").hidden = true; document.body.style.overflow = ""; viewerState = null;
});

// ---- 입력 ----
let debounce;
qEl.addEventListener("input", () => {
  $("#clear").hidden = !qEl.value;
  clearTimeout(debounce);
  debounce = setTimeout(() => search(qEl.value), 220);
});
$("#clear").addEventListener("click", () => {
  qEl.value = ""; $("#clear").hidden = true; qEl.focus(); search("");
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 제목 클릭 → 목록으로
$("#home-link").addEventListener("click", showHome);

// 사이드바 sticky 기준: 헤더 실제 높이를 CSS 변수로
const setHeaderH = () => document.documentElement.style.setProperty("--header-h", document.querySelector("header").offsetHeight + "px");
setHeaderH();
addEventListener("resize", setHeaderH);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  // 새 서비스워커가 컨트롤을 잡으면 한 번만 새로고침 → 항상 최신 항목/데이터 반영
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
}
