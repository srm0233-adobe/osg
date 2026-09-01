// Content-first, theme-aware footer.
// Fetches a footer fragment and builds:
//   - main footer row: brand (logo + social icons) + link columns
//   - dark legal bar: privacy links + copyright
// All copy/links/images come from the fragment; this file only reads + arranges.

import { getMetadata } from '../../scripts/aem.js';

/**
 * The folder that contains the current page, e.g. a page at
 * `/magazines/bowhunter/home-local` yields `/magazines/bowhunter/`. Nav/footer
 * fragments live alongside the pages in their brand folder, so this is where we
 * look first.
 * @returns {string} the current page's folder path, trailing slash included
 */
function currentFolder() {
  const { pathname } = window.location;
  return pathname.slice(0, pathname.lastIndexOf('/') + 1);
}

/**
 * Fetch the first footer fragment that resolves. Fragments live in the page's
 * own brand folder (e.g. `/magazines/bowhunter/`), so we look there first: a
 * theme-scoped `footer-<theme>` (when the page declares a `theme`), then the
 * folder's default `footer`. Legacy site-root/`/content` locations are kept as
 * fallbacks so older content keeps working and unthemed pages are unaffected.
 * @returns {Promise<string|null>} the fragment HTML, or null if none resolved
 */
async function fetchFooterFragment() {
  const theme = (getMetadata('theme') || '').trim().toLowerCase();
  const candidates = [];
  // 1. walk up the page's ancestor folders — the page's own folder first, then
  // each parent up to the site root. This lets a nested page (e.g. an editorial
  // article at `/magazines/bowhunter/editorial/`) inherit the brand footer that
  // lives one level up in `/magazines/bowhunter/`. Theme-scoped `footer-<theme>`
  // is preferred over the folder default at each level.
  let folder = currentFolder();
  while (folder) {
    if (theme) candidates.push(`${folder}footer-${theme}.plain.html`);
    candidates.push(`${folder}footer.plain.html`);
    if (folder === '/') break;
    // strip the trailing segment: `/magazines/bowhunter/editorial/` → `/magazines/bowhunter/`
    folder = folder.replace(/[^/]+\/$/, '');
  }
  // 2. legacy site-root / localhost-content fallbacks
  if (theme) candidates.push(`/content/footer-${theme}.plain.html`, `/footer-${theme}.plain.html`);
  candidates.push('/content/footer.plain.html', '/footer.plain.html');
  // eslint-disable-next-line no-restricted-syntax
  for (const url of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(url);
    if (resp.ok) return resp.text();
  }
  return null;
}

/**
 * Build the footer DOM from the fetched fragment.
 * @param {HTMLElement} fragment parsed footer.plain.html container
 * @param {HTMLElement} block the footer block element
 */
function buildFooter(fragment, block) {
  const sections = Array.from(fragment.querySelectorAll(':scope > div'));
  // Section 0 = brand (logo + social). Last section = legal bar. Middle = link columns.
  const brand = sections[0];
  const legal = sections[sections.length - 1];
  const columns = sections.slice(1, sections.length - 1);

  const footer = document.createElement('div');
  footer.className = 'footer-inner';

  // --- Main row ---
  const main = document.createElement('div');
  main.className = 'footer-main';

  if (brand) {
    const brandCol = document.createElement('div');
    brandCol.className = 'footer-brand';
    const logo = brand.querySelector('p');
    if (logo) brandCol.append(logo.cloneNode(true));
    const social = brand.querySelector('ul');
    if (social) {
      const socialList = social.cloneNode(true);
      socialList.className = 'footer-social';
      brandCol.append(socialList);
    }
    main.append(brandCol);
  }

  const linksWrap = document.createElement('div');
  linksWrap.className = 'footer-columns';
  columns.forEach((col) => {
    const c = document.createElement('div');
    c.className = 'footer-column';
    Array.from(col.children).forEach((child) => c.append(child.cloneNode(true)));
    linksWrap.append(c);
  });
  main.append(linksWrap);
  footer.append(main);

  // --- Legal bar ---
  if (legal) {
    const legalBar = document.createElement('div');
    legalBar.className = 'footer-legal';
    const legalInner = document.createElement('div');
    legalInner.className = 'footer-legal-inner';
    const links = legal.querySelector('ul');
    if (links) {
      const l = links.cloneNode(true);
      l.className = 'footer-legal-links';
      legalInner.append(l);
    }
    const copy = legal.querySelector('p');
    if (copy) {
      const c = copy.cloneNode(true);
      c.className = 'footer-copyright';
      legalInner.append(c);
    }
    legalBar.append(legalInner);
    footer.append(legalBar);
  }

  block.textContent = '';
  block.append(footer);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // Theme-aware, dual-path fetch. Themed pages get a brand-scoped footer with
  // a default fallback.
  const html = await fetchFooterFragment();
  if (!html) return;
  const fragment = document.createElement('div');
  fragment.innerHTML = html;
  buildFooter(fragment, block);
}
