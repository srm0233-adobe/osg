/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Petersen's Hunting section breaks.
 *
 * The homepage template defines 9 sections (see page-templates.json). This
 * transformer inserts an <hr> section break before every section except the
 * first (8 breaks total). No section defines a `style`, so no Section Metadata
 * blocks are created.
 *
 * Section selectors come from page-templates.json (DOM-verified during page
 * analysis) and are stored as arrays; we normalize to the first entry.
 *
 * Breaks are inserted in beforeTransform (while every section element still
 * exists) because block parsers run between the hooks and replace section
 * elements via element.replaceWith(block). A bare <hr> is not a <div>, so it
 * never disturbs a parser's :nth-of-type selectors. Section Metadata (none
 * here) would be anchored in afterTransform via a marker. Sections are walked
 * in reverse so unprocessed sections stay where querySelector found them.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

function sectionSelector(section) {
  return Array.isArray(section.selector) ? section.selector[0] : section.selector;
}

export default function transform(hookName, element, payload) {
  const sections = (payload.template && payload.template.sections) || [];

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue; // first section: no leading break
      const sectionEl = element.querySelector(sectionSelector(section));
      if (!sectionEl) continue; // selector didn't match on this page — skip, never guess

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue; // no styled sections on this page

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || element.querySelector(sectionSelector(section));
      if (!anchor) continue; // neither survived — skip, never guess

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove();
      }
    }
  }
}
