/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-promo. Base block: carousel.
 * Source: http://localhost:8899/home-local.html ("More You May Be Interested In" logo carousel)
 * Instance selector: div.wrapper > .caro.multi
 * Generated: 2026-08-25
 *
 * Carousel is a 2-column block: [image | text content]. Row 1 = block name
 * (handled by createBlock). Each subsequent row = one slide. These are
 * image-only promo tiles (a linked brand logo, no text), so each row uses the
 * linked image in cell 1 and an empty text cell.
 */
export default function parse(element, { document }) {
  const slides = Array.from(element.querySelectorAll(':scope > .caro-item'));

  const cells = [];

  slides.forEach((slide) => {
    const link = slide.querySelector('a[href]');
    const image = slide.querySelector('img');
    if (!image) return;

    // Prefer the wrapping link (carries the promo destination); else bare image.
    let imageCell = image;
    if (link) {
      const linkWrap = link.cloneNode(false);
      linkWrap.appendChild(image.cloneNode(true));
      imageCell = linkWrap;
    }

    cells.push([imageCell, '']);
  });

  // Empty-block guard.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-promo', cells });
  element.replaceWith(block);
}
