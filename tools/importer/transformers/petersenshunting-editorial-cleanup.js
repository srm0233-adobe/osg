/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Petersen's Hunting editorial-article cleanup.
 *
 * Scope: the editorial-article template (e.g. /editorial/.../<id>). This is a
 * pure default-content reading page — no blocks. The raw source is already
 * stripped to <main> (no masthead/footer/ads/modals), so this transformer's job
 * is limited to:
 *   1. Normalizing <figure>/<figcaption> into the EDS default-content
 *      convention: a native image followed by an emphasized (italic) caption
 *      paragraph, so the caption round-trips as `_caption_` under the image.
 *   2. Unwrapping redundant nested single-child spans (the byline wrapper).
 *   3. Removing the non-authorable breadcrumb sub-nav (auto-generated from the
 *      category taxonomy; not authored per page).
 *   4. Stripping schema.org microdata annotations (itemscope/itemtype/itemprop/
 *      property/content) that the site shell injects; not authorable content.
 *
 * Every selector verified against migration-work/cleaned.html and the raw
 * source migration-work/ammovault-raw.html. Kept separate from
 * petersenshunting-cleanup.js (the homepage shell cleanup) per the migration
 * plan — the homepage shell selectors (masthead/footer/ads/modals) do not exist
 * on this template.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Unwrap nested single-child spans so authorable text isn't buried in
    // presentational wrappers. Found in cleaned.html: the byline
    // <span class="byline"><span>By Jace Bauserman</span></span>.
    element.querySelectorAll('span > span:only-child').forEach((inner) => {
      inner.replaceWith(...inner.childNodes);
    });

    // Normalize <figure> into EDS default-content image + italic caption.
    // Found in cleaned.html: hero <figure id="MainContent_hero_photo" ...> plus
    // three inline <figure class="story-image ..."> each wrapping <img> +
    // <figcaption>. Replace each figure with the bare <img> followed by a
    // <p><em>caption</em></p> so the caption renders as emphasized text below
    // the image (EDS caption convention).
    element.querySelectorAll('figure').forEach((fig) => {
      const img = fig.querySelector('img');
      if (!img) return;
      const figcaption = fig.querySelector('figcaption');
      const fragment = document.createDocumentFragment();
      fragment.appendChild(img);
      if (figcaption && figcaption.textContent.trim()) {
        const p = document.createElement('p');
        const em = document.createElement('em');
        while (figcaption.firstChild) em.appendChild(figcaption.firstChild);
        p.appendChild(em);
        fragment.appendChild(p);
      }
      fig.replaceWith(fragment);
    });
  }

  if (hookName === TransformHook.afterTransform) {
    // Breadcrumb sub-nav (non-authorable site chrome, auto-generated from the
    // Gear / Ammo category taxonomy). Found in cleaned.html:
    // <nav class="sub-nav bread-container">.
    WebImporter.DOMUtils.remove(element, [
      'nav.sub-nav.bread-container',
      // Safe leftover / non-authorable elements (present in raw source head/body).
      'link',
      'noscript',
    ]);

    // Strip schema.org microdata annotations the site shell injects. Found in
    // raw source (ammovault-raw.html): itemscope/itemtype/itemprop on <article>,
    // <figure>, the byline spans, and content="August 27, 2026" on the date
    // span. Not authorable; removing the attributes leaves visible text intact.
    element.querySelectorAll('[itemscope], [itemtype], [itemprop], [property], [content]').forEach((el) => {
      el.removeAttribute('itemscope');
      el.removeAttribute('itemtype');
      el.removeAttribute('itemprop');
      el.removeAttribute('property');
      el.removeAttribute('content');
    });
  }
}
