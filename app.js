/* Vibeboard — renders public/data/repos.json. Zero deps, DOM-safe (textContent only). */
"use strict";

const state = { board: "trending", group: "", topics: new Set(), q: "" };
let DATA = null;

const $ = (sel) => document.querySelector(sel);
const boardEl = $("#board");
const emptyEl = $("#empty");
const chipsEl = $("#chips");
const groupEl = $("#group");

function esc(node, text) { node.textContent = text == null ? "" : String(text); }

function fmt(n) {
  return n == null ? "—" : Number(n).toLocaleString("en-US");
}

function relDate(iso) {
  if (!iso) return "unknown";
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return d.toISOString().slice(0, 10);
}

let repoMap = null;
function allRepos() {
  if (repoMap) return repoMap;
  repoMap = new Map();
  // 新格式：repos 扁平数组；旧格式兜底：boards 里是行对象
  if (Array.isArray(DATA.repos)) {
    for (const r of DATA.repos) repoMap.set(r.name, r);
  } else {
    for (const list of Object.values(DATA.boards)) {
      for (const r of list) if (typeof r === "object" && !repoMap.has(r.name)) repoMap.set(r.name, r);
    }
  }
  return repoMap;
}

function renderStats() {
  const m = DATA.meta;
  esc($("#stats"), `tracked ${fmt(m.repoCount)} repos · ★${fmt(m.totalStars)} · upd ${relDate(m.generatedAt)}`);
}

// 标签下拉的数据源：优先管线动态簇，旧文件退回启发式 category
function groupOptions() {
  const groups = DATA.meta.tagGroups;
  if (groups && groups.length) return groups;
  const counts = new Map();
  for (const r of allRepos().values()) counts.set(r.category, (counts.get(r.category) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => ({ id: `cat:${cat}`, label: cat, count, topics: [] }));
}

function renderGroupPick() {
  const repos = allRepos();
  const opts = [{ id: "", label: "All tags", count: repos.size }, ...groupOptions()];
  groupEl.replaceChildren(...opts.map((g) => {
    const o = document.createElement("option");
    o.value = g.id;
    esc(o, `${g.label} (${g.count})`);
    return o;
  }));
  groupEl.value = state.group;
}

function renderChips() {
  chipsEl.replaceChildren();
  if (!state.group) return;
  const g = groupOptions().find((x) => x.id === state.group);
  if (!g || !g.topics.length) return;
  for (const t of g.topics) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.topic = t.topic;
    b.setAttribute("aria-pressed", String(state.topics.has(t.topic)));
    esc(b, `${t.topic} ${t.count}`);
    chipsEl.append(b);
  }
}

function currentRows() {
  const raw = DATA.boards[state.board] || [];
  const rows = typeof raw[0] === "string" ? raw.map((n) => allRepos().get(n)).filter(Boolean) : raw;
  const q = state.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (state.group) {
      let hit;
      if (state.topics.size) {
        // 簇内精选：命中任一选中 topic 即入选，名次按当前榜指标在子集内重排
        hit = (r.topics || []).some((t) => state.topics.has(t));
      } else {
        hit = state.group.startsWith("cat:")
          ? r.category === state.group.slice(4)
          : (r.groups || []).includes(state.group);
      }
      if (!hit) return false;
    }
    if (q && !(`${r.name} ${r.desc || ""}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

function kv(label, value) {
  const s = document.createElement("span");
  s.className = "kv";
  const b = document.createElement("b");
  esc(b, label);
  s.append(b, document.createTextNode(` ${value}`));
  return s;
}

function buildRow(r, i) {
  const li = document.createElement("li");
  li.className = "row";
  li.dataset.open = "false";
  li.style.animationDelay = `${Math.min(i, 14) * 40}ms`;

  const main = document.createElement("div");
  main.className = "row-main";
  main.tabIndex = 0;
  main.setAttribute("role", "button");
  main.setAttribute("aria-expanded", "false");
  main.setAttribute("aria-label", `${r.name} — expand details`);

  const rank = document.createElement("span");
  rank.className = "rank";
  esc(rank, String(i + 1).padStart(2, "0"));

  const ident = document.createElement("div");
  ident.className = "ident";
  const nameLine = document.createElement("div");
  nameLine.className = "name-line";
  const a = document.createElement("a");
  a.className = "repo-name";
  a.href = r.url;
  a.target = "_blank";
  a.rel = "noopener";
  esc(a, r.name);
  a.addEventListener("click", (e) => e.stopPropagation());
  const tag = document.createElement("span");
  tag.className = "cat-tag";
  esc(tag, r.category);
  nameLine.append(a, tag);
  const desc = document.createElement("p");
  desc.className = "desc";
  esc(desc, r.desc);
  ident.append(nameLine, desc);

  const metrics = document.createElement("div");
  metrics.className = "metrics";
  const stars = document.createElement("span");
  stars.className = "stars";
  esc(stars, fmt(r.stars));
  const delta = document.createElement("span");
  const d = r.stars7d;
  delta.className = "delta" + (d == null ? " zero" : "");
  esc(delta, d == null ? "—" : `+${fmt(d)}/w`);
  const lang = document.createElement("span");
  lang.className = "lang";
  esc(lang, r.lang || "");
  const chev = document.createElement("span");
  chev.className = "chev";
  esc(chev, "▸");
  metrics.append(stars, delta, lang, chev);

  main.append(rank, ident, metrics);

  const detail = document.createElement("div");
  detail.className = "detail";
  const inner = document.createElement("div");
  inner.className = "detail-inner";
  const body = document.createElement("div");
  body.className = "detail-body";
  body.append(
    kv("license", r.license || "—"),
    kv("forks", fmt(r.forks)),
    kv("created", (r.created || "").slice(0, 10)),
    kv("pushed", relDate(r.pushed)),
  );
  if (r.topics && r.topics.length) body.append(kv("topics", r.topics.join(" ")));
  if (r.homepage) {
    const hl = document.createElement("a");
    hl.href = r.homepage;
    hl.target = "_blank";
    hl.rel = "noopener";
    esc(hl, "homepage ↗");
    body.append(hl);
  }
  const gl = document.createElement("a");
  gl.href = r.url;
  gl.target = "_blank";
  gl.rel = "noopener";
  esc(gl, "github ↗");
  body.append(gl);
  inner.append(body);
  detail.append(inner);

  const toggle = () => {
    const open = li.dataset.open === "true";
    li.dataset.open = String(!open);
    main.setAttribute("aria-expanded", String(!open));
  };
  main.addEventListener("click", toggle);
  main.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });

  li.append(main, detail);
  return li;
}

function render() {
  const rows = currentRows();
  boardEl.replaceChildren(...rows.map(buildRow));
  emptyEl.hidden = rows.length > 0;
  for (const b of chipsEl.children) {
    b.setAttribute("aria-pressed", String(state.topics.has(b.dataset.topic)));
  }
  for (const t of document.querySelectorAll(".tabs [role=tab]")) {
    t.setAttribute("aria-selected", String(t.dataset.board === state.board));
  }
}

document.querySelector(".tabs").addEventListener("click", (e) => {
  const t = e.target.closest("[data-board]");
  if (!t) return;
  state.board = t.dataset.board;
  render();
});

groupEl.addEventListener("change", (e) => {
  state.group = e.target.value;
  state.topics.clear();
  renderChips();
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

fetch("public/data/repos.json")
  .then((res) => {
    if (!res.ok) throw new Error(`data fetch failed: ${res.status}`);
    return res.json();
  })
  .then((data) => {
    DATA = data;
    renderStats();
    renderGroupPick();
    renderChips();
    render();
  })
  .catch((err) => {
    emptyEl.hidden = false;
    esc(emptyEl, `Failed to load data: ${err.message}`);
    console.error(err);
  });
