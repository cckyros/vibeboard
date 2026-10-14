import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isProductRepo,
  dedupeByName,
  categorize,
  starsLast7d,
  normalizeRepo,
  buildBoards,
} from "../scripts/pipeline.mjs";

const base = {
  archived: false,
  fork: false,
  disabled: false,
  license: { spdx_id: "MIT" },
  description: "A real shipped product that does things",
  topics: [],
  name: "owner/cool-app",
};

test("isProductRepo: rejects archived/fork/no-license/no-desc", () => {
  assert.equal(isProductRepo({ ...base, archived: true }), false);
  assert.equal(isProductRepo({ ...base, fork: true }), false);
  assert.equal(isProductRepo({ ...base, license: null }), false);
  assert.equal(isProductRepo({ ...base, description: "" }), false);
  assert.equal(isProductRepo({ ...base, description: "short" }), false);
  assert.equal(isProductRepo(base), true);
});

test("isProductRepo: rejects curation repos by NAME signal", () => {
  const cases = [
    "awesome-vibe-coding",
    "vibe-coding-list",
    "vibe-coding-tutorial",
    "learn-vibe-coding-course",
    "claude-code-resources",
    "vibe-prompts",
    "vcoding-collection",
    "claude-code-best-practice",
    "bestpractices-toolkit",
    "vibe教程",
  ];
  for (const name of cases) {
    assert.equal(isProductRepo({ ...base, name }), false, name);
  }
});

test("isProductRepo: keeps products whose name merely contains risky words", () => {
  const keep = [
    "checklist-app", // \blist\b boundary — 'checklist' must NOT match
    "docly-editor",
    "promptkit", // 'prompt' alone is fine; 'prompts' is excluded
    "skills-cli",
    "exampler-render",
    "tourguide-app", // 'guide' inside word — boundary check
  ];
  for (const name of keep) {
    assert.equal(isProductRepo({ ...base, name }), true, name);
  }
});

test("isProductRepo: rejects curation via strong DESC markers", () => {
  assert.equal(
    isProductRepo({
      ...base,
      description: "An awesome list of vibe coding resources",
    }),
    false,
  );
  assert.equal(
    isProductRepo({ ...base, description: "A video tutorial for agents" }),
    false,
  );
  assert.equal(
    isProductRepo({ ...base, description: "开源的 AI Skills 合集，收录各种技能" }),
    false,
  );
  assert.equal(isProductRepo({ ...base, description: "Ship your app fast" }), true);
});

test("isProductRepo: rejects by excluded topic tag", () => {
  assert.equal(isProductRepo({ ...base, topics: ["awesome"] }), false);
  assert.equal(isProductRepo({ ...base, topics: ["prompts"] }), false);
  assert.equal(isProductRepo({ ...base, topics: ["ai", "saas"] }), true);
});

test("dedupeByName keeps first occurrence", () => {
  const a = { full_name: "x/y", v: 1 };
  const b = { full_name: "x/y", v: 2 };
  const c = { full_name: "z/w", v: 3 };
  assert.deepEqual(dedupeByName([a, b, c]).map((r) => r.v), [1, 3]);
});

test("categorize: agents/games/cli/devtools/apps/other", () => {
  assert.equal(categorize({ name: "x/agent-swarm", topics: [] }), "Agents");
  assert.equal(categorize({ name: "x/space-game", topics: [] }), "Games");
  assert.equal(categorize({ name: "x/my-cli", topics: [] }), "CLI");
  assert.equal(categorize({ name: "x/sdk", topics: [] }), "DevTools");
  assert.equal(categorize({ name: "x/ios-app", topics: [] }), "Apps");
  assert.equal(categorize({ name: "x/foo", description: "a website builder", topics: [] }), "Sites");
  assert.equal(categorize({ name: "x/mystery", topics: [] }), "Other");
});

test("starsLast7d counts WatchEvents only, within 7d", () => {
  const now = new Date("2026-10-13T00:00:00Z");
  const events = [
    { type: "WatchEvent", created_at: "2026-10-12T00:00:00Z" },
    { type: "WatchEvent", created_at: "2026-10-07T00:00:00Z" },
    { type: "PushEvent", created_at: "2026-10-12T00:00:00Z" }, // not a star
    { type: "WatchEvent", created_at: "2026-10-05T00:00:00Z" }, // too old
  ];
  assert.equal(starsLast7d(events, now), 2);
  assert.equal(starsLast7d([], now), 0);
});

test("normalizeRepo shapes the public record", () => {
  const r = normalizeRepo(
    {
      full_name: "a/b",
      description: "  desc  ",
      html_url: "https://github.com/a/b",
      homepage: "  https://b.dev ",
      stargazers_count: 10,
      forks_count: 2,
      language: "TypeScript",
      license: { spdx_id: "MIT" },
      created_at: "2026-01-01",
      pushed_at: "2026-10-01",
      topics: ["ai"],
    },
    { stars7d: 4 },
  );
  assert.equal(r.homepage, "https://b.dev");
  assert.equal(r.desc, "desc");
  assert.equal(r.stars7d, 4);
  assert.equal(r.category, "Other");
});

test("buildBoards: three boards, correct order & filters", () => {
  const now = new Date("2026-10-13T00:00:00Z");
  const repos = [
    { name: "a", stars: 100, forks: 0, created: "2026-09-01", stars7d: 2 },
    { name: "b", stars: 50, forks: 0, created: "2026-10-01", stars7d: 40 },
    { name: "c", stars: 500, forks: 0, created: "2025-01-01", stars7d: null },
  ];
  const { trending, alltime, fresh } = buildBoards(repos, now);
  assert.deepEqual(trending.map((r) => r.name), ["b", "a"]); // velocity order; null excluded
  assert.deepEqual(alltime.map((r) => r.name), ["c", "a", "b"]);
  assert.deepEqual(fresh.map((r) => r.name), ["a", "b"]); // c too old; a>b by stars
});
