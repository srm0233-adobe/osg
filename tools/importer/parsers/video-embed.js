/* eslint-disable */
/* global WebImporter */
/**
 * Parser for video-embed. Base block: video.
 * Source: http://localhost:8899/home-local.html (Petersen's Hunting homepage — "Featured Video" sidebar)
 * Instance selector: .home-sidebar-video .is-fixed
 * Generated: 2026-08-25
 *
 * The video block is a single-column block. Row 1 is the block name (handled by
 * createBlock). Row 2 holds the video content in one cell: the "Featured Video"
 * label heading, the embedded player (iframe/video link), the featured video
 * title, and the "See All Videos" CTA.
 *
 * Source note: the player iframe is lazy-loaded with no resolvable src, so we
 * preserve the surrounding structure (label, title, CTA link) which carries the
 * meaningful content and the destination link.
 */
export default function parse(element, { document }) {
  // "Featured Video" label heading.
  const label = element.querySelector('h2');

  // Video player iframe (lazy — may lack src) or the video player container.
  const iframe = element.querySelector('iframe');

  // Featured video title.
  const title = element.querySelector('h3');

  // CTA — e.g. "See All Videos".
  const cta = element.querySelector('a.btn, a.full-gray, a[class*="btn"]');

  const contentCell = [];
  if (label) contentCell.push(label);
  if (iframe && (iframe.getAttribute('src') || iframe.getAttribute('data-src'))) {
    contentCell.push(iframe);
  }
  if (title) contentCell.push(title);
  if (cta && (!title || !title.contains(cta))) contentCell.push(cta);

  // Empty-block guard: nothing meaningful to embed.
  if (contentCell.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  cells.push([contentCell]); // 1-column block: one row, one cell holding all content.

  const block = WebImporter.Blocks.createBlock(document, { name: 'video-embed', cells });
  element.replaceWith(block);
}
