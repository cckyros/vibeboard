/* Vibeboard — state + events; view builders live in ui.js, 3D field in bg3d.js. */
import {
  esc,
  renderStats,
  renderGroupPick,
  renderChips,
  currentRows,
  buildRow,
} from "./ui.js";

const state = { board: "trending", group: "", topics: new Set(), q: "" };
let DATA = null;

const $ = (sel) => document.querySelector(sel);
const boardEl = $("#board");
const emptyEl = $("#empty");
const chipsEl = $("#chips");
const groupEl = $("#group");
const tabsEl = $(".tabs");

// iOS segmented-control thumb: slides under the selected tab.
const thumb = document.createElement("div");
thumb.className = "thumb";
thumb.setAttribute("aria-hidden", "true");
tabsEl.prepend(thumb);

function moveThumb() {
  const sel = tabsEl.querySelector(`[data-board="${state.board}"]`);
  if (!sel) return;
  thumb.style.width = `${sel.offsetWidth}px`;
  thumb.style.transform = `translateX(${sel.offsetLeft}px)`;
}

function render() {
  const rows = currentRows(DATA, state);
  boardEl.replaceChildren(...rows.map(buildRow));
  emptyEl.hidden = rows.length > 0;
  for (const b of chipsEl.children) {
    b.setAttribute("aria-pressed", String(state.topics.has(b.dataset.topic)));
  }
  for (const t of tabsEl.querySelectorAll("[role=tab]")) {
    t.setAttribute("aria-selected", String(t.dataset.board === state.board));
  }
  moveThumb();
}

tabsEl.addEventListener("click", (e) => {
  const t = e.target.closest("[data-board]");
  if (!t) return;
  state.board = t.dataset.board;
  render();
});

groupEl.addEventListener("change", (e) => {
  state.group = e.target.value;
  state.topics.clear();
  renderChips(chipsEl, DATA, state);
  render();
});

chipsEl.addEventListener("click", (e) => {
  const b = e.target.closest("[data-topic]");
  if (!b) return;
  const t = b.dataset.topic;
  if (state.topics.has(t)) state.topics.delete(t);
  else state.topics.add(t);
  render();
});

$("#q").addEventListener("input", (e) => {
  state.q = e.target.value;
  render();
});

addEventListener("resize", moveThumb);
addEventListener("load", moveThumb);
document.fonts?.ready.then(moveThumb);

fetch("public/data/repos.json")
  .then((res) => {
    if (!res.ok) throw new Error(`data fetch failed: ${res.status}`);
    return res.json();
  })
  .then((data) => {
    DATA = data;
    renderStats($("#stats"), DATA);
    renderGroupPick(groupEl, DATA, state);
    renderChips(chipsEl, DATA, state);
    render();
  })
  .catch((err) => {
    emptyEl.hidden = false;
    esc(emptyEl, `Failed to load data: ${err.message}`);
    console.error(err);
  });

// Live gradient field — best-effort; the CSS fallback is always painted.
const bg = $("#bg3d");
if (bg) {
  import("./bg3d.js")
    .then((m) => m.start(bg))
    .catch(() => {});
}
