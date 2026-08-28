/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Petersen's Hunting editorial-article section breaks.
 *
 * The editorial-article template is pure default content (no blocks). Page
 * analysis (migration-work/page-structure.json) identifies two sections:
 *   1. Article Body  — breadcrumb (removed by cleanup), H1, H2 deck, hero
 *      figure+caption, date/byline, long-form body with H3s and inline
 *      captioned figures. No style; it is the first section, so no leading
 *      break and no Section Metadata.
 *   2. Author Bio   — the visually distinct bordered bio card. Needs a section
 *      break before it and a Section Metadata block with style="author-bio".
 *
 * WHY SECTIONS ARE EMBEDDED HERE (not read from the template payload):
 * block-mapping-manager only populates the section list in page-templates.json
 * for templates that have blocks; this template has none, so its section list
 * is empty. The two boundaries below therefore come directly from page analysis
 * and are carried in this file. This also keeps the transformer self-contained
 * and correct regardless of which template payload the validator harness binds.
 *
 * Section boundary selectors verified against migration-work/cleaned.html:
 *   - Article body root: article#article01
 *   - Author bio card:   div.bio-editorial.row.first-xs
 *
 * Hook split follows the reference implementation: insert the <hr> break in
 * beforeTransform (while section elements exist), and anchor the Section
 * Metadata block in afterTransform via a temporary marker attribute on the
 * inserted <hr>. A bare <hr> never disturbs a parser's :nth-of-type selectors.
 * The Section Metadata table is placed at the END of the bio section (after the
 * bio card), per the EDS Section Metadata convention.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

// DOM-verified boundaries from migration-work/page-structure.json.
// index 0 = first section (no leading break, no metadata).
const SECTIONS = [
  {
    id: 'section-1',
    name: 'Article Body',
    selector: 'article#article01',
    style: null,
  },
  {
    id: 'section-2',
    name: 'Author Bio',
    selector: 'div.bio-editorial.row.first-xs',
    style: 'author-bio',
  },
];

export default function transform(hookName, element, payload) {
  if (hookName === 'beforeTransform') {
    // Insert breaks in reverse so unprocessed sections stay where querySelector
    // found them. Skip the first section (no leading break).
    for (let i = SECTIONS.length - 1; i >= 1; i -= 1) {
      const section = SECTIONS[i];
      const sectionEl = element.querySelector(section.selector);
      if (!sectionEl) continue; // selector didn't match — skip, never guess

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = SECTIONS.length - 1; i >= 0; i -= 1) {
      const section = SECTIONS[i];
      if (!section.style) continue; // only styled sections get Section Metadata

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const sectionEl = element.querySelector(section.selector);
      if (!sectionEl && !marker) continue; // nothing survived — skip, never guess

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });

      // Place the metadata at the END of the section (after the bio card).
      if (sectionEl) {
        sectionEl.after(metadataBlock);
      } else {
        marker.after(metadataBlock);
      }

      if (marker) marker.removeAttribute(SECTION_MARKER_ATTR);
    }
  }
}
