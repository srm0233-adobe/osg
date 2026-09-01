import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * A cards-articles block can be authored two ways:
 *  1. Static — each row is a card (image cell + body cell).
 *  2. Feed-driven — a single cell holds a link to a `query-index.json`. The
 *     block then pulls the article feed and renders a card per entry.
 * Detect the feed shape: exactly one link referencing a query-index feed,
 * with no image alongside it. The DA authoring layer can sanitize the link's
 * href (turning `query-index.json` into `query-index-json`), so we accept any
 * link that mentions `query-index` in its href OR its visible text, and prefer
 * whichever value is a proper `.json` URL for the actual fetch.
 * @param {HTMLElement} block
 * @returns {string|null} the feed URL, or null if this is a static block
 */
function getFeedUrl(block) {
  const links = block.querySelectorAll('a[href]');
  if (links.length !== 1 || block.querySelector('picture, img')) return null;
  const link = links[0];
  const href = link.getAttribute('href') || '';
  const text = (link.textContent || '').trim();
  if (!/query-index/i.test(href) && !/query-index/i.test(text)) return null;
  // Prefer the href — it's same-origin (relative), avoiding the CORS failure
  // the absolute text URL would cause. DA may sanitize `query-index.json` to
  // `query-index-json`, so normalize the extension. Fall back to the link
  // text only if the href isn't the feed reference.
  const feed = /query-index/i.test(href) ? href : text;
  return feed.replace(/query-index-json/i, 'query-index.json');
}

/** Titles in the feed carry an " - <brand>" site suffix (e.g.
 *  " - Petersen's Hunting", " - Bowhunter"); strip the trailing " - …" segment
 *  for display. */
function cleanTitle(title) {
  return (title || '').replace(/\s*[-|–]\s*[^-|–]+$/i, '').trim();
}

/** A feed row is publishable only if it has a real, non-placeholder title and
 *  isn't a scaffold/test doc. Skips empty docs, unresolved template
 *  placeholders (the "x-schema-name" default draft pages ship with), and any
 *  page whose path is a "test" stub left in the editorial folder. */
function isPublishable(row) {
  const t = cleanTitle(row.title);
  if (!t || /^x-schema-name$/i.test(t)) return false;
  if (/\/test$/i.test(row.path || '')) return false;
  return true;
}

/**
 * Build one card <li> matching the static markup the CSS expects:
 *   li > div.cards-articles-card-image (a > picture) + div.cards-articles-card-body
 * @param {object} row a feed entry
 */
function buildCard(row) {
  const li = document.createElement('li');
  const title = cleanTitle(row.title) || row.path.split('/').pop();

  const imageCol = document.createElement('div');
  imageCol.className = 'cards-articles-card-image';
  const imgLink = document.createElement('a');
  imgLink.href = row.path;
  if (row.image) {
    const pic = createOptimizedPicture(row.image, title, false, [{ width: '750' }]);
    imgLink.append(pic);
  }
  imgLink.append(document.createTextNode(title));
  imageCol.append(imgLink);

  const body = document.createElement('div');
  body.className = 'cards-articles-card-body';

  // Category pill — from the `category` field, falling back to the first
  // `tags` entry. Only rendered when the feed provides one.
  const category = (row.category || '').trim()
    || (row.tags || '').split(',').map((t) => t.trim()).filter(Boolean)[0];
  if (category) {
    const p = document.createElement('p');
    p.className = 'button-container';
    const a = document.createElement('a');
    a.className = 'button';
    a.href = row.path;
    a.textContent = category;
    p.append(a);
    body.append(p);
  }

  const h3 = document.createElement('h3');
  const titleLink = document.createElement('a');
  titleLink.href = row.path;
  titleLink.textContent = title;
  h3.append(titleLink);
  body.append(h3);

  if (row.description) {
    const desc = document.createElement('p');
    desc.textContent = row.description;
    body.append(desc);
  }

  // Author byline — always last, matching the static cards (styled as the
  // card body's last <p>).
  if ((row.author || '').trim()) {
    const author = document.createElement('p');
    author.textContent = row.author.trim();
    body.append(author);
  }

  li.append(imageCol, body);
  return li;
}

/** The article date, from our custom `publishDate` index property (the
 *  reserved `date` column is left to the indexer's own handling). */
function rowDate(row) {
  return row.publishDate || row.date || '';
}

/**
 * Order feed rows newest-first by article date. Dates are ISO (YYYY-MM-DD) so
 * lexical compare works, but parse to be safe; rows without a valid date sort
 * to the bottom, preserving their original relative order.
 */
function byDateDesc(a, b) {
  const ta = Date.parse(rowDate(a));
  const tb = Date.parse(rowDate(b));
  const va = Number.isNaN(ta) ? -Infinity : ta;
  const vb = Number.isNaN(tb) ? -Infinity : tb;
  return vb - va;
}

/**
 * Fetch the feed and render cards. Entries without a title (placeholder/empty
 * docs like a stray "test" page) are skipped.
 * @param {HTMLElement} block
 * @param {string} feedUrl
 */
async function renderFeed(block, feedUrl) {
  const ul = document.createElement('ul');
  try {
    const resp = await fetch(feedUrl);
    if (!resp.ok) throw new Error(`feed ${resp.status}`);
    const { data = [] } = await resp.json();
    data
      .filter(isPublishable)
      .sort(byDateDesc)
      .forEach((row) => ul.append(buildCard(row)));
  } catch (e) {
    // On failure leave the block empty rather than showing a raw JSON link.
  }
  block.textContent = '';
  block.append(ul);
}

/** Static rendering: turn each authored row into a card <li>. */
function renderStatic(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-articles-card-image';
      else div.className = 'cards-articles-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}

export default function decorate(block) {
  const feedUrl = getFeedUrl(block);
  if (feedUrl) {
    renderFeed(block, feedUrl);
  } else {
    renderStatic(block);
  }
}
