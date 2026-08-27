/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-covers. Base block: cards.
 * Source: http://localhost:8899/home-local.html
 *   Instance A: #FooterMagazineGlobal_getmagazineSection .row.has-prods ("Other Magazines")
 *   Instance B: #FooterMagazineGlobal_specialinterestSection .row.has-prods ("Special Interest Magazines")
 * Generated: 2026-08-25
 *
 * Cards is a 2-column block: [image | text content]. Row 1 = block name
 * (handled by createBlock). Each subsequent row = one magazine cover tile:
 *   - Cell 1: cover image, wrapped in its main link (links to the magazine).
 *   - Cell 2: title (heading) and the buy/subscribe CTA.
 *
 * Source note: each tile carries the cover in a visible `.main-link`
 * (image + title h3 + a non-anchor `span.btn`) and a `.mobile-links` group that
 * repeats the title (h6) and provides the CTA as a real `<a href>`. We keep the
 * cover title from `.main-link` and append the `.mobile-links` group so the CTA
 * is a proper link and all source content is preserved.
 */
export default function parse(element, { document }) {
  const tiles = Array.from(element.querySelectorAll(':scope > .grid-item'));

  const cells = [];

  tiles.forEach((tile) => {
    const mainLink = tile.querySelector('a.main-link');
    const image = tile.querySelector('img');

    // Cover image cell — wrap the image in its main link (keeps destination),
    // stripping the title/CTA markup that also lives inside the main link.
    let imageCell = image || '';
    if (mainLink && image) {
      const linkWrap = mainLink.cloneNode(false);
      linkWrap.appendChild(image.cloneNode(true));
      imageCell = linkWrap;
    }

    const textCell = [];
    // Cover title.
    const title = tile.querySelector('.content h3, h3');
    if (title) textCell.push(title);

    // Mobile-links group: repeats the title (h6) and holds the real CTA anchor.
    const mobile = tile.querySelector('.mobile-links');
    if (mobile) {
      textCell.push(mobile);
    } else {
      // Fallback: build a CTA anchor from the span.btn text + main link href.
      const spanCta = tile.querySelector('.content .btn, .btn');
      if (spanCta && mainLink && mainLink.getAttribute('href')) {
        const a = document.createElement('a');
        a.setAttribute('href', mainLink.getAttribute('href'));
        a.textContent = spanCta.textContent.trim();
        textCell.push(a);
      }
    }

    if (image || textCell.length) {
      cells.push([imageCell, textCell]);
    }
  });

  // Empty-block guard.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-covers', cells });
  element.replaceWith(block);
}
