# Vibeboard

**The evidence wall of vibe coding** — a public scoreboard of open-source products built with vibe coding, ranked by real GitHub data. No hype: the repo link is the receipt.

- Static frontend (zero dependencies, ~15KB JS/CSS)
- Node data pipeline pulling live GitHub REST API data
- Deployed free on GitHub Pages, data refreshed by GitHub Actions

## What it ranks

Repos tagged `vibe-coding` / `vibecoding` / `vibe-coded` / `vibecoded` / `vibecode`, filtered to **shipped products**: public, non-fork, non-archived, licensed, described, not a list/tutorial/resource repo.

Boards:

- **Trending 7d** — star events in the last 7 days, estimated from the public repo events feed (capped ~300 events/repo; very hot repos may be undercounted)
- **All-time** — total stars
- **New** — created within 60 days, by stars

## Local dev

```bash
# fetch live data -> public/data/repos.json (token recommended: ~5000 req/hr)
GH_TOKEN=$(gh auth token) node scripts/fetch-data.mjs --limit 120

# serve
python -m http.server 8321   # or: npx serve .
# open http://127.0.0.1:8321/
```

## Tests

```bash
node --test test/pipeline.test.mjs   # unit tests: filters, dedupe, scoring, boards
```

## Data refresh (CI)

`.github/workflows/refresh.yml` runs the fetch daily and commits `public/data/repos.json` when it changed. Pages redeploys automatically.

## Deployment

**GitHub Pages (active):** repo Settings → Pages → Deploy from branch → `main` / root. Site at `https://<owner>.github.io/vibeboard/`.

**Cloudflare Pages (alternative, also free):**

1. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git
2. Pick this repo; framework preset "None"; build command empty; output dir `/`
3. Free `*.pages.dev` subdomain; custom domain free incl. TLS
4. Requires a Cloudflare account login — not automated here

## Honest limitations

- Trending velocity is an *estimate*: GitHub restricts the stargazers list endpoint for third-party repos (404), so we count `WatchEvent`s in the public events feed instead — hot repos can be undercounted within the ~300-event window.
- "Vibe-coded" is self-declared via topics; repos without the tags aren't tracked.
- Category assignment is heuristic (name/desc/topics keywords), not hand-reviewed.

## License

MIT (site code). Repository data © respective owners, via the GitHub REST API under its terms of use.
