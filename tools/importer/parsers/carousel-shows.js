/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-shows. Base block: carousel.
 * Source: http://localhost:8899/home-local.html (Petersen's Hunting homepage — "Watch" show promos)
 * Instance selector: .caro.wide.feature.caps-feature
 * Generated: 2026-08-25
 *
 * Carousel is a 2-column block: [image | text content]. Row 1 = block name
 * (handled by createBlock). Each subsequent row = one slide:
 *   - Cell 1: slide image (these show promos have no image → empty cell).
 *   - Cell 2: title (heading link), description paragraph, CTA link.
 */
export default function parse(element, { document }) {
  const slides = Array.from(element.querySelectorAll(':scope > .caro-item'));

  const cells = [];

  slides.forEach((slide) => {
    const image = slide.querySelector('img');

    const textCell = [];
    // Title heading (with its link).
    const heading = slide.querySelector('h3');
    if (heading) textCell.push(heading);
    // Description paragraph.
    const description = slide.querySelector('.content p, p');
    if (description) textCell.push(description);
    // CTA link (e.g. "Preview", "Watch Now").
    const cta = slide.querySelector('a.btn, a[class*="btn"]');
    if (cta && (!heading || !heading.contains(cta))) textCell.push(cta);

    if (image || textCell.length) {
      cells.push([image || '', textCell]);
    }
  });

  // Empty-block guard.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-shows', cells });
  element.replaceWith(block);
}
