/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-articles. Base block: cards.
 * Source: http://localhost:8899/home-local.html (Petersen's Hunting homepage — Latest Articles grid)
 * Instance selector: .grid.default-grid.four-wide.latest-articles
 * Generated: 2026-08-25
 *
 * Cards is a 2-column block: [image | text content]. Row 1 = block name
 * (handled by createBlock). Each subsequent row = one article card:
 *   - Cell 1: article thumbnail image.
 *   - Cell 2: category tag link, title (heading link), optional description
 *             (p.clamp-me), author (p.author-name).
 *
 * Source note: the grid's first `.grid-item` is the "Featured Video" sidebar
 * (a separate video-embed block) and must be excluded — real article cards are
 * the `.grid-item` items that are NOT `.is-sidebar`.
 *
 * The scraped/rendered DOM does not reliably keep the article cards as *direct*
 * children of the grid (the browser re-nests the malformed source, so
 * ':scope > .grid-item' matches only the sidebar). Select article cards by a
 * descendant query instead: any `.grid-item` that is not the sidebar and does
 * not itself contain a nested `.grid-item` (leaf cards only).
 */
export default function parse(element, { document }) {
  const cards = Array.from(element.querySelectorAll('.grid-item'))
    .filter((card) => !card.classList.contains('is-sidebar')
      && !card.querySelector('.grid-item'));

  const cells = [];

  cards.forEach((card) => {
    // Prefer the image anchor (wraps the thumbnail plus the sr-only accessible
    // title and links to the article); fall back to the bare <img>.
    const imageLink = card.querySelector('a.article-link');
    const image = card.querySelector('img');
    const imageCell = imageLink || image || '';

    const textCell = [];
    // Category tag (e.g. "How-To").
    const tag = card.querySelector('a.tag, .article-content a.tag');
    if (tag) textCell.push(tag);
    // Title heading (with its link).
    const heading = card.querySelector('h3');
    if (heading) textCell.push(heading);
    // Optional description.
    const description = card.querySelector('p.clamp-me');
    if (description) textCell.push(description);
    // Author.
    const author = card.querySelector('p.author-name');
    if (author) textCell.push(author);

    // Only emit a row if the card has meaningful content.
    if (image || textCell.length) {
      cells.push([imageCell, textCell]);
    }
  });

  // Empty-block guard.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-articles', cells });
  element.replaceWith(block);
}
