// Pure pipeline functions — no network, no fs. Unit-tested.

export const TOPIC_QUERIES = [
  "vibe-coding",
  "vibecoding",
  "vibe-coded",
  "vibecoded",
  "vibecode",
];

// Repos whose *purpose* is curation/teaching, not a shipped product.
// Name is high-signal: apply the full list there. Description is noisier:
// only strong curation markers disqualify.
const NAME_EXCLUDE_RE =
  /awesome|curated|\blist\b|\btutorial\b|\bcourse\b|\bguide\b|docs?\b|cheatsheet|roadmap|\binterview\b|\bprompts?\b|resources?\b|collection|best-?practices?|\bexamples?\b|翻译|教程|指南|收集|合集/i;
const DESC_EXCLUDE_RE =
  /awesome list|curated list|\btutorial\b|\bcourse\b|cheatsheet|资源合集|合集|教程/i;

// Topics that disqualify even if name/desc looks like a product.
const EXCLUDE_TOPICS = new Set([
  "awesome",
  "awesome-list",
  "list",
  "tutorial",
  "course",
  "resources",
  "collection",
  "documentation",
  "cheatsheet",
  "interview",
  "roadmap",
  "prompt-engineering",
  "prompts",
]);

export function isProductRepo(r) {
  if (!r || r.archived || r.fork || r.disabled) return false;
  if (!r.license) return false;
  if (!r.description || r.description.trim().length < 8) return false;
  if (NAME_EXCLUDE_RE.test(r.name)) return false;
  if (DESC_EXCLUDE_RE.test(r.description)) return false;
  const topics = r.topics || [];
  if (topics.some((t) => EXCLUDE_TOPICS.has(t))) return false;
  return true;
}

export function dedupeByName(repos) {
  const seen = new Map();
  for (const r of repos) {
    if (!seen.has(r.full_name)) seen.set(r.full_name, r);
  }
  return [...seen.values()];
}

const CATEGORY_RULES = [
  ["Agents", /\bagent|mcp|swarm|copilot|multi-?agent|tool[- ]?call/i],
  ["Games", /\bgame|roguelike|puzzle|arcade|fps|rpg\b|platformer/i],
  ["CLI", /\bcli\b|terminal|tui\b|command[- ]?line/i],
  ["Extensions", /extension|plugin|addon|vscode|chrome[- ]?ext|neovim|jetbrains/i],
  ["DevTools", /\bsdk\b|\bapi\b|framework|library|\blib\b|compiler|linter|devtools|scaffold|generator/i],
  ["Sites", /\bweb\b|website|landing|dashboard|saas|cms\b|e-?commerce|blog/i],
  ["Apps", /\bapp\b|mobile|desktop|ios\b|android|electron|tauri/i],
];

export function categorize(r) {
  const haystack = `${r.name} ${r.description || ""} ${(r.topics || []).join(" ")}`;
  for (const [label, re] of CATEGORY_RULES) {
    if (re.test(haystack)) return label;
  }
  return "Other";
}

// Stars gained in last 7 days, counted from repo public events
// (WatchEvent entries). `events` = [{type, created_at}]. `now` = Date.
// The events feed is capped (~300 events / ~90d), so hot repos may be
// undercounted — methodology notes this as an estimate.
export function starsLast7d(events, now = new Date()) {
  const cutoff = now.getTime() - 7 * 86400e3;
  return events.filter(
    (e) => e.type === "WatchEvent" && new Date(e.created_at).getTime() >= cutoff,
  ).length;
}

export function normalizeRepo(r, extra = {}) {
  return {
    name: r.full_name,
    desc: (r.description || "").trim(),
    url: r.html_url,
    homepage: r.homepage && r.homepage.trim() ? r.homepage.trim() : null,
    stars: r.stargazers_count,
    forks: r.forks_count,
    lang: r.language || null,
    license: r.license ? r.license.spdx_id : null,
    created: r.created_at,
    pushed: r.pushed_at,
    topics: (r.topics || []).slice(0, 8),
    category: categorize(r),
    stars7d: extra.stars7d ?? null,
  };
}

const DAY = 86400e3;

export function buildBoards(repos, now = new Date()) {
  const trending = [...repos]
    .filter((r) => r.stars7d !== null)
    .sort((a, b) => b.stars7d - a.stars7d || b.stars - a.stars);
  const alltime = [...repos].sort(
    (a, b) => b.stars - a.stars || b.forks - a.forks,
  );
  const cutoff = now.getTime() - 60 * DAY;
  const fresh = [...repos]
    .filter((r) => new Date(r.created).getTime() >= cutoff)
    .sort((a, b) => b.stars - a.stars);
  return { trending, alltime, fresh };
}
