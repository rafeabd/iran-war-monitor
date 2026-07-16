# Iran War Monitor — System Documentation

## Core Architecture

A fully static site (`index.html` + `styles/` + `js/main.js`) hosted on GitHub
Pages, rendering four committed JSON files from `data/`. There is no backend
and no client-side API key. Two update channels exist:

1. **Wire feed (automatic).** `.github/workflows/update-news.yml` runs twice
   daily, executes `node scripts/fetch-news.mjs`, and commits `data/news.json`
   if it changed. The push triggers the Pages deploy workflow.
2. **Briefing, timeline, figures (synthesized).** `data/briefing.json`,
   `data/timeline.json` and `data/facts.json` are written by Claude following
   the update workflow below — either on request ("refresh the briefing") or
   via a scheduled routine.

## Daily Briefing Update Workflow

**Step 1: Ingest the wire.** Run `node scripts/fetch-news.mjs`, then read
`data/news.json`. The script pulls public RSS (Google News query, Al Jazeera,
BBC, The Guardian, NPR), filters for Iran-war relevance, dedupes by normalized
title, and keeps the freshest 80 items.

**Step 2: Story synthesis & ranking.** Deduplicate the day's coverage into
distinct stories, then rank by systemic significance (war-trajectory and
market-wide developments trump single incidents), scale, breadth, novelty, and
continuity with prior briefings. The top 3–5 stories receive `featured: true`
— these become the site's Top Stories and anchor the `overview`, `keyPoints`,
and all summary layers.

**Step 3: Writing summaries.** The `overview` (≈100 words) leads with the
day's single most-important featured story and traces the through-line
connecting the top stories. The `keyPoints` are terse one-liners (≤30 words
each) covering featured stories first, then 1–2 essential macro datapoints,
each tagged with the story ID via `storyId`. Each featured story gets a
`summary` (one solid paragraph) and, when its logic isn't self-evident, an
`explainer` that demystifies the mechanics (why Hormuz matters, what a
detainee release signals) — bias toward inclusion.

**Step 4: Watch items.** `watch` holds 1–3 dated catalysts: scheduled talks,
standing ultimatums, unresolved crises. Each entry has a `date` label and a
one-sentence `text`.

**Step 5: Structural files.** Extend `data/timeline.json` with any new major
events (keep the `phase` taxonomy: prelude / opening / escalation / diplomacy
/ collapse) and update `data/facts.json` figures and its `status` block when
reporting moves. Never delete timeline events; the record only grows.

**Step 6: Validation & publication.** All JSON must pass
`python3 -m json.tool`. Verify locally (`python3 -m http.server`), then commit
and push to `main` — Pages redeploys automatically in ~60–90s.

## Writing Principles

Prose assumes a smart reader who doesn't know any of the names. Every person
and entity gets a compact identifying clause on first mention: "Dena Karari, a
dual US-Iranian citizen detained since 2024," never a bare name. The three
summary layers — Top Stories (detailed), `overview` (meaning), `keyPoints`
(fast facts) — must cohere: all point at the same featured stories, each at a
different altitude, never repeating the same sentence. Casualty and damage
figures are always attributed and hedged; fog-of-war numbers are orders of
magnitude, not facts.

## Data Schemas

**`data/briefing.json`** — `date`, `generatedAt`, `overview`, `keyPoints`
(array of `{text, storyId}`), `watch` (array of `{date, text}`), `stories`
(array of `{id, featured, title, publisher, url, summary, explainer?}`),
`notes`.

**`data/news.json`** — machine-generated; `generatedAt`, `articleCount`,
`sources`, `articles` (array of `{title, url, source, publishedAt, summary}`).
Never hand-edit.

**`data/timeline.json`** — `updatedAt`, `note`, `events` (array of
`{date, label, title, body, phase}`).

**`data/facts.json`** — `updatedAt`, `caveat`, `warStartDate`, `background`,
`status` (`{headline, detail}` — drives the masthead flag), `groups` (stat
groups of `{value, label, note?}`), `actors`.
