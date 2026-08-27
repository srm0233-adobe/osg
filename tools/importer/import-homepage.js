/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import videoEmbedParser from './parsers/video-embed.js';
import cardsArticlesParser from './parsers/cards-articles.js';
import carouselShowsParser from './parsers/carousel-shows.js';
import columnsMediaParser from './parsers/columns-media.js';
import cardsVideoParser from './parsers/cards-video.js';
import cardsCoversParser from './parsers/cards-covers.js';
import carouselPromoParser from './parsers/carousel-promo.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/petersenshunting-cleanup.js';
import sectionsTransformer from './transformers/petersenshunting-sections.js';

// PARSER REGISTRY
const parsers = {
  'video-embed': videoEmbedParser,
  'cards-articles': cardsArticlesParser,
  'carousel-shows': carouselShowsParser,
  'columns-media': columnsMediaParser,
  'cards-video': cardsVideoParser,
  'cards-covers': cardsCoversParser,
  'carousel-promo': carouselPromoParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: "Petersen's Hunting homepage - magazine landing page with latest articles, featured video, recent videos carousel, digital single issue purchase, related magazines grid, and special interest magazines grid.",
  urls: [
    'http://localhost:8899/home-local.html',
  ],
  blocks: [
    {
      name: 'video-embed',
      instances: ['.home-sidebar-video .is-fixed'],
    },
    {
      name: 'cards-articles',
      instances: ['.grid.default-grid.four-wide.latest-articles'],
    },
    {
      name: 'carousel-shows',
      instances: ['.caro.wide.feature.caps-feature'],
    },
    {
      name: 'columns-media',
      instances: [
        'section.wrapper.home-video-promo.clearfix',
        'section.wrapper.buy-issue',
      ],
    },
    {
      name: 'cards-video',
      instances: ['.row.flex-grid.video-grid'],
    },
    {
      name: 'cards-covers',
      instances: [
        'section#FooterMagazineGlobal_getmagazineSection.has-prods-container .row.has-prods',
        'section#FooterMagazineGlobal_specialinterestSection.has-prods-container .row.has-prods',
      ],
    },
    {
      name: 'carousel-promo',
      instances: ['div.wrapper > .caro.multi'],
    },
  ],
  sections: [
    { id: 'section-1', name: 'Latest Articles', selector: ['section.wrapper.has-grid.lastest-articles.clearfix:nth-of-type(1)'], style: null, blocks: ['video-embed', 'cards-articles'], defaultContent: ['section.wrapper.has-grid.lastest-articles.clearfix:nth-of-type(1) > h2'] },
    { id: 'section-2', name: 'Watch', selector: ['div.wrapper.no-padding-bottom'], style: null, blocks: ['carousel-shows'], defaultContent: ['div.wrapper.no-padding-bottom h2'] },
    { id: 'section-3', name: 'Hunting Adventures TV', selector: ['section.wrapper.home-video-promo.clearfix'], style: null, blocks: ['columns-media'], defaultContent: ['section.wrapper.home-video-promo.clearfix h2'] },
    { id: 'section-4', name: 'Recent Videos', selector: ['section.wrapper.has-grid.lastest-articles.clearfix:nth-of-type(2)'], style: null, blocks: ['cards-video'], defaultContent: ['section.wrapper.has-grid.lastest-articles.clearfix:nth-of-type(2) h2'] },
    { id: 'section-5', name: 'Get the Magazine', selector: ['div.wrapper.narrow'], style: null, blocks: [], defaultContent: ['div.wrapper.narrow h2', 'div.wrapper.narrow p', 'div.wrapper.narrow a'] },
    { id: 'section-6', name: 'Buy Digital Single Issues', selector: ['section.wrapper.buy-issue'], style: null, blocks: ['columns-media'], defaultContent: ['section.wrapper.buy-issue h2'] },
    { id: 'section-7', name: 'Other Magazines', selector: ['section#FooterMagazineGlobal_getmagazineSection.has-prods-container'], style: null, blocks: ['cards-covers'], defaultContent: ['section#FooterMagazineGlobal_getmagazineSection h2'] },
    { id: 'section-8', name: 'Special Interest Magazines', selector: ['section#FooterMagazineGlobal_specialinterestSection.has-prods-container'], style: null, blocks: ['cards-covers'], defaultContent: ['section#FooterMagazineGlobal_specialinterestSection h2'] },
    { id: 'section-9', name: 'More You May Be Interested In', selector: ['div.wrapper > .caro.multi'], style: null, blocks: ['carousel-promo'], defaultContent: ['div.wrapper .caro.multi'] },
  ],
};

// TRANSFORMER REGISTRY (section transformer runs after cleanup)
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

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

/**
 * Find all blocks on the page based on the embedded template configuration
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. beforeTransform (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block (skip elements already replaced/detached)
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (final cleanup + section breaks)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized path (map root/homepage to /index)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
