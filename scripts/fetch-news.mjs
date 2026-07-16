#!/usr/bin/env node
/**
 * Fetches Iran-war coverage from public RSS feeds, filters, dedupes, and
 * writes data/news.json. Zero dependencies — runs locally and in CI.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = join(ROOT, 'data', 'news.json');

const MAX_ITEMS = 80;
const MAX_AGE_DAYS = 10;
const FETCH_TIMEOUT_MS = 20000;

const FEEDS = [
  {
    source: 'Google News',
    aggregator: true,
    url: 'https://news.google.com/rss/search?q=iran+war+when:7d&hl=en-US&gl=US&ceid=US:en',
  },
  {
    source: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
  },
  {
    source: 'BBC News',
    url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
  },
  {
    source: 'The Guardian',
    url: 'https://www.theguardian.com/world/iran/rss',
  },
  {
    source: 'NPR',
    url: 'https://feeds.npr.org/1004/rss.xml',
  },
];

const RELEVANT = /\b(iran|iranian|irgc|tehran|hormuz|khamenei|pezeshkian|persian gulf|strait|centcom|epic fury)\b/i;

function decodeEntities(text) {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function stripHtml(text) {
  return decodeEntities(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return match ? match[1].trim() : '';
}

function parseItems(xml, feed) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  return blocks.flatMap((block) => {
    const title = stripHtml(tag(block, 'title'));
    const link = decodeEntities(tag(block, 'link'));
    const pubDate = tag(block, 'pubDate');
    const description = stripHtml(tag(block, 'description')).slice(0, 300);
    if (!title || !link) return [];

    const publishedAt = new Date(pubDate);
    if (Number.isNaN(publishedAt.getTime())) return [];

    // Google News appends " - Outlet" to titles; surface the real outlet.
    let source = feed.source;
    let cleanTitle = title;
    if (feed.aggregator) {
      const sep = title.lastIndexOf(' - ');
      if (sep > 20) {
        source = title.slice(sep + 3).trim();
        cleanTitle = title.slice(0, sep).trim();
      }
    }

    return [{
      title: cleanTitle,
      url: link,
      source,
      publishedAt: publishedAt.toISOString(),
      summary: feed.aggregator ? '' : description,
    }];
  });
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'user-agent': 'iran-war-monitor/1.0 (+github pages static site)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = parseItems(xml, feed);
    console.error(`[fetch] ${feed.source}: ${items.length} items`);
    return items;
  } catch (err) {
    console.error(`[fetch] ${feed.source} FAILED: ${err.message}`);
    return [];
  }
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').slice(0, 80);
}

const results = await Promise.all(FEEDS.map(fetchFeed));
const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

const seen = new Set();
const articles = results
  .flat()
  .filter((a) => RELEVANT.test(`${a.title} ${a.summary}`))
  .filter((a) => new Date(a.publishedAt).getTime() >= cutoff)
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  .filter((a) => {
    const key = normalizeTitle(a.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .slice(0, MAX_ITEMS);

if (articles.length === 0) {
  console.error('[fetch] no articles collected — keeping previous news.json');
  process.exit(1);
}

const payload = {
  generatedAt: new Date().toISOString(),
  articleCount: articles.length,
  sources: [...new Set(articles.map((a) => a.source))].sort(),
  articles,
};

await mkdir(dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, JSON.stringify(payload, null, 2) + '\n');
console.error(`[fetch] wrote ${articles.length} articles to data/news.json`);
