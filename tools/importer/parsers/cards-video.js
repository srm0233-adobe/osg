/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-video. Base block: cards.
 * Source: http://localhost:8899/home-local.html (Petersen's Hunting homepage — Recent Videos grid)
 * Instance selector: .row.flex-grid.video-grid
 * Generated: 2026-08-25
 *
 * Cards is a 2-column block: [image | text content]. Row 1 = block name
 * (handled by createBlock). Each subsequent row = one video card:
 *   - Cell 1: video thumbnail image (inside the video article-link).
 *   - Cell 2: category tag link and title (heading link).
 *
 * Source note: each card also has a hidden `.article-hover` overlay that
 * duplicates the tag/title and adds a teaser paragraph; we extract from the
 * primary `.content > .article-content` region and use the image anchor
 * (which links to the video) for the thumbnail cell.
 */
export default function parse(element, { document }) {
  const cards = Array.from(element.querySelectorAll(':scope > .grid-item'));

  const cells = [];

  cards.forEach((card) => {
    // Primary content region (excludes the hover overlay).
    const content = card.querySelector(':scope > .content') || card;

    // Thumbnail: prefer the video anchor (links to the video); fall back to img.
    const imageLink = content.querySelector('a.article-link');
    const image = content.querySelector('img');
    const imageCell = imageLink || image || '';

    const textCell = [];
    // Category tag (e.g. "Hunting").
    const tag = content.querySelector('.article-content a.tag, a.tag');
    if (tag) textCell.push(tag);
    // Title heading (with its link).
    const heading = content.querySelector('.article-content h3, h3');
    if (heading) textCell.push(heading);
    // Teaser description — lives in the hover overlay for these video cards.
    const description = card.querySelector('.article-hover p');
    if (description) textCell.push(description);

    if (image || textCell.length) {
      cells.push([imageCell, textCell]);
    }
  });

  // Empty-block guard.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-video', cells });
  element.replaceWith(block);
}
