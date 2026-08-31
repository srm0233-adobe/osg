/*
 * Author Bio block.
 * Authored with a single link to an author fragment in the author-bios folder
 * (e.g. /magazines/author-bios/jace-bauserman). The block fetches that
 * structured fragment, reads its fields (name, headshot, headshotAlt, bio,
 * authorPageUrl) and renders the bio so authors never retype an author's info.
 * The output DOM matches the previous author-bio section markup so the styling
 * carries over:  photo <p><picture> · <h2>name</h2> · <p>bio</p> · CTA link.
 */

/**
 * Parse a fetched author fragment into a field map. The fragment is a DA
 * structured doc: each field is a row `<div><div><h3 id="key"></h3></div>
 * <div>…value…</div></div>` inside a `.author-bio` container.
 * @param {string} html the fragment's .plain.html
 * @returns {{fields: Object, valueEls: Object}} scalar text fields + raw value els
 */
function parseAuthorFragment(html) {
  const doc = document.createElement('div');
  doc.innerHTML = html;
  const container = doc.querySelector('.author-bio') || doc;
  const fields = {};
  const valueEls = {};
  container.querySelectorAll(':scope > div').forEach((row) => {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length < 2) return;
    const key = (cells[0].textContent || '').trim().toLowerCase();
    if (!key) return;
    fields[key] = (cells[1].textContent || '').trim();
    [valueEls[key]] = [cells[1]];
  });
  return { fields, valueEls };
}

/**
 * Fetch the first author fragment that resolves. Accepts the authored href as
 * given, plus a couple of tolerant fallbacks (DA can sanitize/relativize).
 * @param {string} href
 * @returns {Promise<string|null>}
 */
async function fetchAuthorFragment(href) {
  const clean = href.split('#')[0].split('?')[0].replace(/\.html$/i, '').replace(/\/$/, '');
  const candidates = [`${clean}.plain.html`];
  // If an absolute site URL was authored, also try its same-origin path.
  try {
    const u = new URL(clean, window.location.origin);
    if (u.origin === window.location.origin) candidates.push(`${u.pathname}.plain.html`);
  } catch (e) { /* href was already a path */ }
  // eslint-disable-next-line no-restricted-syntax
  for (const url of [...new Set(candidates)]) {
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(url);
    if (resp.ok) return resp.text();
  }
  return null;
}

/**
 * Build the bio DOM (matches the prior author-bio section markup).
 * @param {object} data { fields, valueEls }
 * @returns {HTMLElement} the .default-content-wrapper
 */
function buildBio({ fields, valueEls }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'default-content-wrapper';
  const name = fields.name || '';

  // Photo — first paragraph, as the CSS targets p:first-child > img.
  if (fields.headshot) {
    const p = document.createElement('p');
    const pic = document.createElement('picture');
    const img = document.createElement('img');
    img.src = fields.headshot;
    img.alt = fields.headshotalt && fields.headshotalt !== fields.slug
      ? fields.headshotalt : `photo of ${name}`;
    img.loading = 'lazy';
    pic.append(img);
    p.append(pic);
    wrapper.append(p);
  }

  // Name heading.
  if (name) {
    const h2 = document.createElement('h2');
    h2.id = 'author-name';
    h2.textContent = name;
    wrapper.append(h2);
  }

  // Bio — the fragment stores it as a single-item <ul><li>; render its text
  // as a paragraph. Fall back to whatever text the bio cell held.
  const bioText = valueEls.bio ? valueEls.bio.textContent.trim() : (fields.bio || '');
  if (bioText) {
    const p = document.createElement('p');
    p.textContent = bioText;
    wrapper.append(p);
  }

  // "See more articles" CTA → styled button, matching the previous markup.
  const authorUrl = fields.authorpageurl || fields.authorpage || '';
  if (authorUrl && name) {
    const p = document.createElement('p');
    p.className = 'button-container';
    const a = document.createElement('a');
    a.href = authorUrl;
    a.title = `See more articles from ${name}`;
    a.className = 'button';
    a.textContent = `See more articles from ${name}`;
    p.append(a);
    wrapper.append(p);
  }

  return wrapper;
}

export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  const href = link ? link.getAttribute('href') : block.textContent.trim();
  if (!href) return;

  // If the author has no matching fragment (or it has no usable data), leave
  // the section blank rather than showing the raw authored link.
  const html = await fetchAuthorFragment(href);
  if (!html) { block.textContent = ''; return; }

  const data = parseAuthorFragment(html);
  if (!data.fields.name) { block.textContent = ''; return; }

  block.textContent = '';
  block.append(buildBio(data));
}
