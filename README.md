# Iran War Monitor

**Live site:** https://rafeabd.github.io/iran-war-monitor/

A static, self-updating tracker of the 2026 Iran war:

- **Daily briefing** — a synthesized overview, key points, watch items, and
  featured top stories, written following the layered-summary method
  documented in [CLAUDE.md](CLAUDE.md).
- **Wire feed** — headlines from AP, Reuters, Al Jazeera, BBC, The Guardian,
  NPR and others, refreshed twice daily by a GitHub Action
  (`.github/workflows/update-news.yml`) that commits `data/news.json`.
- **Timeline & figures** — a curated record of the war's major events and
  contested statistics, with sourcing caveats.

No build step, no backend, no API keys. Plain HTML/CSS/JS on GitHub Pages.

## Local development

```bash
node scripts/fetch-news.mjs     # refresh the wire feed
python3 -m http.server 4173     # serve locally
```

See [CLAUDE.md](CLAUDE.md) for the full update workflow and data schemas.
