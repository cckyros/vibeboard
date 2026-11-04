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

/* ---------- Tag groups：把原始 topics 归进生态/品类簇 ----------
   每个 repo 可属多簇；簇的真实 topics 和计数由 buildTagMeta 动态统计，
   新 topic 进语料会自动出现在所属簇（未命中的落进 tagStats 原始榜）。 */
export const TAG_GROUPS = [
  { id: "claude", label: "Claude", re: /^claude|anthropic/ },
  { id: "codex", label: "Codex", re: /^codex|openai-codex/ },
  { id: "cursor", label: "Cursor", re: /^cursor/ },
  { id: "gemini", label: "Gemini", re: /^gemini|google/ },
  { id: "mcp", label: "MCP", re: /^mcp|model-context-protocol/ },
  { id: "agents", label: "Agents", re: /agent|swarm|copilot|autonomous|agentic/ },
  { id: "skills", label: "Skills", re: /skill/ },
  { id: "cli", label: "CLI", re: /^cli$|^tui$|terminal|command-?line|shell/ },
  { id: "web", label: "Web", re: /^web|front[- ]?end|react|vue|svelte|nextjs|html|css|tailwind|dashboard|website|landing/ },
  { id: "apps", label: "Apps", re: /\bapp\b|mobile|ios|android|desktop|electron|tauri|macos|windows/ },
  { id: "games", label: "Games", re: /game|puzzle|roguelike|arcade|fps|rpg/ },
  { id: "devtools", label: "DevTools", re: /sdk|api$|framework|library|devtools|developer-tools|plugin|extension|vscode|neovim|generator|scaffold|template|boilerplate|testing|linter|compiler/ },
  { id: "automation", label: "Automation", re: /automation|workflow|devops|^ci$|n8n|pipeline/ },
  { id: "llm", label: "AI/LLM", re: /^ai$|^ai-|^llm|gpt|openai|generative|machine-learning|deep-learning|transformer|rag$|embedding/ },
  { id: "data", label: "Data", re: /data$|database|sqlite|postgres|mysql|^sql|analytics|duckdb/ },
  { id: "security", label: "Security", re: /security|pentest|cyber|osint|ctf/ },
  { id: "vibe", label: "Vibe-tagged", re: /^vibe/ },
];

const TAG_RE = new Map(TAG_GROUPS.map((g) => [g.id, new RegExp(g.re.source, "i")]));

export function assignGroups(topics) {
  const out = [];
  for (const t of topics || []) {
    for (const g of TAG_GROUPS) {
      if (TAG_RE.get(g.id).test(t) && !out.includes(g.id)) out.push(g.id);
    }
  }
  return out;
}

/** 动态统计：原始 topic 计数（top N）+ 各簇 {label,count,topics 实际命中}。 */
export function buildTagMeta(repos, topN = 40) {
  const stats = new Map();
  const groups = new Map(); // id -> {label,count,topics:Set}
  for (const r of repos) {
    const seen = new Set(r.topics || []);
    for (const t of seen) stats.set(t, (stats.get(t) || 0) + 1);
    for (const gid of r.groups || assignGroups([...seen])) {
      if (!groups.has(gid)) {
        const def = TAG_GROUPS.find((g) => g.id === gid);
        groups.set(gid, { id: gid, label: def?.label ?? gid, count: 0, topics: new Set() });
      }
      const g = groups.get(gid);
      g.count++;
      for (const t of seen) if (TAG_RE.get(gid).test(t)) g.topics.add(t);
    }
  }
  const tagStats = [...stats.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN)
    .map(([topic, count]) => ({ topic, count }));
  const tagGroups = [...groups.values()].sort((a, b) => b.count - a.count)
    .map((g) => ({
      id: g.id, label: g.label, count: g.count,
      topics: [...g.topics].map((t) => ({ topic: t, count: stats.get(t) })).sort((a, b) => b.count - a.count),
    }));
  return { tagStats, tagGroups };
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
    groups: assignGroups((r.topics || []).slice(0, 8)),
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
