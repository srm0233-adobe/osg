/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-media. Base block: columns.
 * Source: http://localhost:8899/home-local.html
 *   Instance A: section.wrapper.home-video-promo.clearfix ("Hunting Adventures TV")
 *   Instance B: section.wrapper.buy-issue ("Buy Digital Single Issues")
 * Generated: 2026-08-25
 *
 * Columns is a multi-column block. Row 1 = block name (handled by createBlock).
 * The media row is two side-by-side columns:
 *   - Cell 1: left media — a video player (iframe) or an icon/app image.
 *   - Cell 2: right text — heading, description, and CTA link(s).
 *
 * The section's leading <h2> is section-level content; it is emitted as a
 * full-width lead row (2 cells: heading + empty) so it renders above the
 * columns while keeping a consistent 2-column table.
 *
 * Source note: video-promo uses a lazy iframe with no resolvable src; when the
 * iframe cannot be embedded we keep the left cell's available media (e.g. the
 * frame container) so structure is preserved.
 */
export default function parse(element, { document }) {
  const row = element.querySelector(':scope > .row') || element.querySelector('.row');
  if (!row) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cols = Array.from(row.querySelectorAll(':scope > div'));

  // Left column: media (video frame / iframe) or an image.
  const leftSrc = cols[0] || null;
  const leftCell = [];
  if (leftSrc) {
    const iframe = leftSrc.querySelector('iframe');
    const leftImg = leftSrc.querySelector('img');
    if (iframe && (iframe.getAttribute('src') || iframe.getAttribute('data-src'))) {
      leftCell.push(iframe);
    } else if (leftImg) {
      leftCell.push(leftImg);
    }
  }

  // Right column: heading, description, CTA/link(s) and any secondary images
  // (e.g. app-store badges).
  const rightSrc = cols[1] || null;
  const rightCell = [];
  if (rightSrc) {
    Array.from(rightSrc.querySelectorAll(':scope > h3, :scope > p, :scope > span, :scope > a'))
      .forEach((node) => rightCell.push(node));
  }

  const cells = [];

  // Lead heading row (full-width intent, kept as 2 cells for column consistency).
  const heading = element.querySelector(':scope > h2');
  if (heading) cells.push([heading, '']);

  // Media + text columns row.
  cells.push([leftCell.length ? leftCell : '', rightCell.length ? rightCell : '']);

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-media', cells });
  element.replaceWith(block);
}
