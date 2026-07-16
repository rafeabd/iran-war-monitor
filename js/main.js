const WIRE_INITIAL_LIMIT = 25;

const $ = (id) => document.getElementById(id);

const fmtDay = new Intl.DateTimeFormat('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
});
const fmtTime = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit', minute: '2-digit', hour12: false,
});

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

function renderMasthead(facts, news) {
  $('dateline').textContent = fmtDay.format(new Date()).toUpperCase();
  const days = Math.floor(
    (Date.now() - new Date(`${facts.warStartDate}T00:00:00Z`).getTime()) / 86400000,
  ) + 1;
  $('day-counter').textContent = `DAY ${days} OF THE WAR`;
  $('status-flag').textContent = facts.status.headline;
  if (news) {
    $('wire-stamp').textContent =
      `${news.articleCount} headlines · updated ${fmtTime.format(new Date(news.generatedAt))} local`;
  }
}

function renderBriefing(briefing) {
  $('briefing-stamp').textContent = `Synthesized ${briefing.date}`;
  $('overview').textContent = briefing.overview;

  const keypoints = $('keypoints');
  for (const point of briefing.keyPoints) {
    keypoints.append(el('li', null, point.text));
  }

  const watchlist = $('watchlist');
  for (const item of briefing.watch) {
    const li = el('li');
    li.append(el('span', 'tag', item.date), document.createTextNode(item.text));
    watchlist.append(li);
  }

  const stories = $('stories');
  for (const story of briefing.stories.filter((s) => s.featured)) {
    const article = el('article', 'story');
    article.append(el('span', 'kicker', story.publisher));

    const heading = el('h3');
    const link = el('a', null, story.title);
    link.href = story.url;
    link.rel = 'noopener';
    heading.append(link);
    article.append(heading, el('p', null, story.summary));

    if (story.explainer) {
      const explainer = el('p', 'explainer');
      explainer.append(el('strong', null, 'Why it matters — '), document.createTextNode(story.explainer));
      article.append(explainer);
    }
    stories.append(article);
  }
}

function renderWire(news) {
  const byDay = new Map();
  for (const article of news.articles) {
    const day = article.publishedAt.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(article);
  }

  const wire = $('wire');
  let shown = 0;
  const overflow = [];

  for (const [day, articles] of byDay) {
    const dayEl = el('div', 'wire-day');
    dayEl.append(el('h3', null, fmtDay.format(new Date(`${day}T12:00:00Z`))));
    const list = el('ul', 'wire-list');

    for (const article of articles) {
      const li = el('li');
      const time = el('time', null, article.publishedAt.slice(11, 16) + 'Z');
      time.dateTime = article.publishedAt;
      const link = el('a', null, article.title);
      link.href = article.url;
      link.rel = 'noopener';
      li.append(time, el('span', 'src', article.source), link);
      list.append(li);

      shown += 1;
      if (shown > WIRE_INITIAL_LIMIT) {
        li.hidden = true;
        overflow.push(li);
      }
    }
    dayEl.append(list);
    wire.append(dayEl);
  }

  if (overflow.length > 0) {
    const button = $('wire-more');
    button.hidden = false;
    button.textContent = `Show all ${news.articleCount} headlines`;
    button.addEventListener('click', () => {
      for (const li of overflow) li.hidden = false;
      button.hidden = true;
    }, { once: true });
  }
}

function renderTimeline(timeline) {
  $('timeline-stamp').textContent = `Curated through ${timeline.updatedAt}`;
  const list = $('timeline');
  for (const event of timeline.events) {
    const li = el('li');
    li.dataset.phase = event.phase;
    li.append(
      el('span', 'tag stamp', event.label),
      el('h3', null, event.title),
      el('p', null, event.body),
    );
    list.append(li);
  }
}

function renderFacts(facts) {
  $('facts-stamp').textContent = `Curated through ${facts.updatedAt}`;
  $('caveat').textContent = facts.caveat;

  const container = $('facts');
  for (const group of facts.groups) {
    const section = el('div', 'facts-group');
    section.append(el('h3', null, group.title));
    const grid = el('div', 'stat-grid');
    for (const stat of group.stats) {
      const card = el('div', 'stat');
      card.append(el('span', 'value', stat.value), el('span', 'label', stat.label));
      if (stat.note) card.append(el('span', 'note', stat.note));
      grid.append(card);
    }
    section.append(grid);
    container.append(section);
  }

  const actors = $('actors');
  for (const actor of facts.actors) {
    actors.append(el('dt', null, actor.side), el('dd', null, actor.members));
  }
}

function renderError(message) {
  $('overview').textContent = `Could not load briefing data (${message}). Try refreshing.`;
  $('status-flag').textContent = 'DATA UNAVAILABLE';
}

try {
  const [briefing, news, timeline, facts] = await Promise.all([
    loadJson('./data/briefing.json'),
    loadJson('./data/news.json'),
    loadJson('./data/timeline.json'),
    loadJson('./data/facts.json'),
  ]);
  renderMasthead(facts, news);
  renderBriefing(briefing);
  renderWire(news);
  renderTimeline(timeline);
  renderFacts(facts);
} catch (err) {
  renderError(err.message);
}
