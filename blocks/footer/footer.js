// Petersen's Hunting footer — content-first.
// Fetches content/footer.plain.html and builds:
//   - main footer row: brand (logo + social icons) + link columns
//   - dark legal bar: privacy links + copyright
// All copy/links/images come from the fragment; this file only reads + arranges.

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
  // Dual-fetch: localhost / aem up serves content under /content; DA/EDS
  // production serves it at the site root. Try both.
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) {
    resp = await fetch('/footer.plain.html');
  }
  if (!resp.ok) return;
  const html = await resp.text();
  const fragment = document.createElement('div');
  fragment.innerHTML = html;
  buildFooter(fragment, block);
}
