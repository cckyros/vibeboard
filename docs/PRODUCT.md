# PRODUCT.md — Vibeboard

## What it is
The evidence wall of vibe coding — a public, zero-dependency static leaderboard of open-source products built with vibe coding. Open-source products only, ranked by real GitHub data (stars, star events, repo metadata). Repo links are the receipts.

## Audience
Builders who vibe-coded a product and want public proof; visitors judging whether vibe-coded products are real.

## Surface mode
Operate — the board is the product surface. Scanability, honest numbers, and one dominant action (open a repo) outrank expression. Ambition shows as precision: alignment, tabular numerals, fast load.

## Domain truth (do not invent)
- Source: GitHub REST API (topic queries + star shards + fresh-repos query); GitHub Actions refresh on a cron.
- Inclusion: public, non-fork, non-archived, has a license, has a description, not a list/tutorial/resource repo.
- Boards: Trending 7d (WatchEvents counted from the public events feed, ~300-event cap, estimated), All-time (total stars), New (created within 60 days, by stars).
- Constraints: no build step, no webfonts, no framework, GitHub Pages static hosting, repo must stay self-contained (vendor any runtime dep).
- Honesty: estimated or capped numbers are labeled in-page; no paid placement; methodology is public in the footer.
