// Fetch vibe-coded OSS products from GitHub -> public/data/repos.json
// Usage: GH_TOKEN=$(gh auth token) node scripts/fetch-data.mjs [--limit N] [--no-velocity]
import { writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TOPIC_QUERIES,
  isProductRepo,
  dedupeByName,
  normalizeRepo,
  starsLast7d,
  buildBoards,
} from "./pipeline.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "data");
const args = process.argv.slice(2);
const LIMIT = args.includes("--limit")
  ? parseInt(args[args.indexOf("--limit") + 1], 10)
  : 150;
const WITH_VELOCITY = !args.includes("--no-velocity");
const PER_PAGE = 100;

function token() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}
const TOKEN = token();
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "vibeboard-fetcher",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function gh(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status} ${url}: ${body.slice(0, 200)}`);
  }
  return res;
}

async function ghJson(url) {
  return (await gh(url)).json();
}

// Public repo events (≤3 pages / ~300 events) — WatchEvents carry star times.
async function recentEvents(repo) {
  const all = [];
  for (let page = 1; page <= 3; page++) {
    const res = await gh(
      `https://api.github.com/repos/${repo.full_name}/events?per_page=100&page=${page}`,
    );
    const items = await res.json();
    all.push(...items);
    if (items.length < 100) break;
  }
  return all;
}

async function searchTopic(topic) {
  const out = [];
  // Two pages per topic = up to 200 candidates each; enough for the pool.
  for (let page = 1; page <= 2; page++) {
    const data = await ghJson(
      `https://api.github.com/search/repositories?q=topic:${topic}` +
        `&sort=stars&order=desc&per_page=${PER_PAGE}&page=${page}`,
    );
    out.push(...(data.items || []));
    if ((data.items || []).length < PER_PAGE) break;
  }
  return out;
}

async function main() {
  console.log(`token: ${TOKEN ? "yes" : "NO (rate limit 60/h)"}`);
  const pool = [];
  for (const t of TOPIC_QUERIES) {
    process.stdout.write(`topic:${t} `);
    try {
      const items = await searchTopic(t);
      console.log(`${items.length}`);
      pool.push(...items);
    } catch (e) {
      console.log(`FAILED: ${e.message.slice(0, 120)}`);
    }
    await new Promise((r) => setTimeout(r, 1500)); // search API: 30/min authed
  }

  const deduped = dedupeByName(pool);
  const products = deduped.filter(isProductRepo);
  console.log(`fetched ${pool.length} -> deduped ${deduped.length} -> products ${products.length}`);

  const byStars = [...products].sort((a, b) => b.stargazers_count - a.stargazers_count);
  const top = byStars.slice(0, LIMIT);

  const normalized = [];
  for (const [i, r] of top.entries()) {
    let stars7d = null;
    if (WITH_VELOCITY) {
      try {
        const events = await recentEvents(r);
        stars7d = starsLast7d(events);
      } catch (e) {
        console.log(`  velocity failed ${r.full_name}: ${e.message.slice(0, 80)}`);
      }
      if (i % 10 === 9) await new Promise((s) => setTimeout(s, 300));
    }
    normalized.push(normalizeRepo(r, { stars7d }));
  }

  const now = new Date();
  const boards = buildBoards(normalized, now);
  const meta = {
    generatedAt: now.toISOString(),
    repoCount: normalized.length,
    totalStars: normalized.reduce((s, r) => s + r.stars, 0),
    topics: TOPIC_QUERIES,
    methodology:
      "Trending = WatchEvents in last 7d (est. from public repo events, " +
      "capped at ~300 events — hot repos may be undercounted). " +
      "All-time = total stars. New = created within 60d by stars. " +
      "Inclusion: public, non-fork, non-archived, has license + description, not a list/tutorial repo.",
  };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, "repos.json"), JSON.stringify({ meta, boards }, null, 1));
  console.log(`wrote public/data/repos.json — trending top: ${boards.trending[0]?.name || "n/a"}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
