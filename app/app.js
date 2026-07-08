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

// 홈 화면: 백과 항목 전체 표시
function showHome() {
  entriesEl.innerHTML = "";
  ENTRIES.forEach(e => entriesEl.appendChild(renderEntry(e)));
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

  // 1) 백과 항목 매칭 (제목/태그/요약)
  const matchedEntries = ENTRIES.filter(e =>
    e.title.includes(q) || e.summary.includes(q) ||
    e.tags.some(t => t.includes(q) || q.includes(t))
  );
  matchedEntries.forEach(e => entriesEl.appendChild(renderEntry(e)));

  // 2) 전문 검색 (검색 가능한 책만)
  const searchable = BOOKS.filter(b => b.searchable);
  let hits = 0;
  resultsEl.innerHTML = '<p class="hint">본문 검색 중…</p>';
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
  if (matchedEntries.length) {
    const h = document.createElement("p");
    h.className = "hint"; h.style.margin = "18px 2px 0";
    h.textContent = hits ? `본문 검색 결과 ${hits}건` : "본문 검색 결과 없음";
    resultsEl.appendChild(h);
  }
  if (hits) resultsEl.appendChild(frag);
  else if (!matchedEntries.length) {
    resultsEl.innerHTML = `<div class="empty">'${escapeHtml(q)}' 검색 결과가 없어요.<br>다른 단어로 찾아보세요.</div>`;
  }

  // 스캔본 안내
  const scan = BOOKS.filter(b => !b.searchable);
  if (scan.length) {
    const note = document.createElement("div");
    note.className = "scan-note";
    note.textContent = `※ 스캔 문서 ${scan.length}권(${scan.map(b => b.title).join(", ")})은 본문 검색이 아직 안 됩니다. 원본 보기는 가능합니다.`;
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
      openViewer(btn.dataset.book, [Number(btn.dataset.page)], 0));
  });
}

// ---- 렌더: 백과 항목 ----
function renderEntry(e) {
  const el = document.createElement("article");
  el.className = "card";
  let html = `<span class="entry-badge">백과 항목</span>
    <h2>${escapeHtml(e.title)}</h2>
    <p class="summary">${escapeHtml(e.summary)}</p>`;

  if (e.calendar) {
    html += `<h3>${escapeHtml(e.calendar.title)}</h3><table><thead><tr><th>시기</th><th>할 일</th></tr></thead><tbody>`;
    e.calendar.rows.forEach(r => {
      html += `<tr><td>${escapeHtml(r.period)}</td><td>${escapeHtml(r.task)}</td></tr>`;
    });
    html += `</tbody></table>`;
    if (e.calendar.note) html += `<p class="tbl-note">${escapeHtml(e.calendar.note)}</p>`;
  }

  if (e.steps) {
    html += `<h3>${escapeHtml(e.steps.title)}</h3><ol class="steps">`;
    e.steps.items.forEach(s => {
      html += `<li><b>${escapeHtml(s.step)}</b><span>${escapeHtml(s.detail)}</span></li>`;
    });
    html += `</ol>`;
  }

  if (e.sources && e.sources.length) {
    html += `<div class="sources"><span class="lbl">출처 원본 보기:</span>`;
    e.sources.forEach(s => {
      const first = s.pages[0];
      html += `<button class="src-btn" data-book="${s.book}" data-pages="${s.pages.join(',')}">${escapeHtml(s.title)} p.${s.pages[0]}${s.pages.length > 1 ? '~' : ''}</button>`;
    });
    html += `</div>`;
  }
  el.innerHTML = html;
  el.querySelectorAll(".src-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const pages = btn.dataset.pages.split(",").map(Number);
      openViewer(btn.dataset.book, pages, 0);
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
  el.addEventListener("click", () => openViewer(book.id, [pageNo], 0));
  return el;
}

// ---- 원본 뷰어 ----
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

// 사이드바 sticky 기준: 헤더 실제 높이를 CSS 변수로
const setHeaderH = () => document.documentElement.style.setProperty("--header-h", document.querySelector("header").offsetHeight + "px");
setHeaderH();
addEventListener("resize", setHeaderH);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
