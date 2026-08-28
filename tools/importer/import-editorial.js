/* eslint-disable */
/* global WebImporter */

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/petersenshunting-editorial-cleanup.js';
import sectionsTransformer from './transformers/petersenshunting-editorial-sections.js';

// PAGE TEMPLATE CONFIGURATION - editorial-article (pure default content, no blocks)
const PAGE_TEMPLATE = {
  name: 'editorial-article',
  description:
    "Editorial article detail page - breadcrumb, headline, deck, hero image with caption, publish date/byline, long-form body with subheadings and inline captioned images, and author bio.",
  urls: ['http://localhost:8899/ammovault-raw.html'],
  blocks: [],
};

// Target document path on DA (org/site srm0233-adobe/osg).
// The source lives at /editorial/ammovault-ammunition-reserve/558282; the client
// asked for it to be built under /petersen-hunting/editorial/.
const TARGET_PATH = '/petersen-hunting/editorial/ammovault-ammunition-reserve';

// TRANSFORMER REGISTRY (section transformer runs after cleanup)
const transformers = [cleanupTransformer, sectionsTransformer];

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. beforeTransform (cleanup: figures -> img + caption, unwrap spans,
    //    remove breadcrumb chrome, strip microdata; mark section boundaries)
    executeTransformers('beforeTransform', main, payload);

    // 2. No blocks on this template — default content only.

    // 3. afterTransform (section breaks + author-bio section metadata)
    executeTransformers('afterTransform', main, payload);

    // 4. WebImporter built-in rules
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 5. Fixed target path for this single-page migration.
    const path = WebImporter.FileUtils.sanitizePath(TARGET_PATH);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: [],
      },
    }];
  },
};
