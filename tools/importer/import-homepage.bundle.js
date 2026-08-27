/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-homepage.js
  var import_homepage_exports = {};
  __export(import_homepage_exports, {
    default: () => import_homepage_default
  });

  // tools/importer/parsers/video-embed.js
  function parse(element, { document: document2 }) {
    const label = element.querySelector("h2");
    const iframe = element.querySelector("iframe");
    const title = element.querySelector("h3");
    const cta = element.querySelector('a.btn, a.full-gray, a[class*="btn"]');
    const contentCell = [];
    if (label) contentCell.push(label);
    if (iframe && (iframe.getAttribute("src") || iframe.getAttribute("data-src"))) {
      contentCell.push(iframe);
    }
    if (title) contentCell.push(title);
    if (cta && (!title || !title.contains(cta))) contentCell.push(cta);
    if (contentCell.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document2, { name: "video-embed", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-articles.js
  function parse2(element, { document: document2 }) {
    const cards = Array.from(element.querySelectorAll(".grid-item")).filter((card) => !card.classList.contains("is-sidebar") && !card.querySelector(".grid-item"));
    const cells = [];
    cards.forEach((card) => {
      const imageLink = card.querySelector("a.article-link");
      const image = card.querySelector("img");
      const imageCell = imageLink || image || "";
      const textCell = [];
      const tag = card.querySelector("a.tag, .article-content a.tag");
      if (tag) textCell.push(tag);
      const heading = card.querySelector("h3");
      if (heading) textCell.push(heading);
      const description = card.querySelector("p.clamp-me");
      if (description) textCell.push(description);
      const author = card.querySelector("p.author-name");
      if (author) textCell.push(author);
      if (image || textCell.length) {
        cells.push([imageCell, textCell]);
      }
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-articles", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel-shows.js
  function parse3(element, { document: document2 }) {
    const slides = Array.from(element.querySelectorAll(":scope > .caro-item"));
    const cells = [];
    slides.forEach((slide) => {
      const image = slide.querySelector("img");
      const textCell = [];
      const heading = slide.querySelector("h3");
      if (heading) textCell.push(heading);
      const description = slide.querySelector(".content p, p");
      if (description) textCell.push(description);
      const cta = slide.querySelector('a.btn, a[class*="btn"]');
      if (cta && (!heading || !heading.contains(cta))) textCell.push(cta);
      if (image || textCell.length) {
        cells.push([image || "", textCell]);
      }
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "carousel-shows", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-media.js
  function parse4(element, { document: document2 }) {
    const row = element.querySelector(":scope > .row") || element.querySelector(".row");
    if (!row) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cols = Array.from(row.querySelectorAll(":scope > div"));
    const leftSrc = cols[0] || null;
    const leftCell = [];
    if (leftSrc) {
      const iframe = leftSrc.querySelector("iframe");
      const leftImg = leftSrc.querySelector("img");
      if (iframe && (iframe.getAttribute("src") || iframe.getAttribute("data-src"))) {
        leftCell.push(iframe);
      } else if (leftImg) {
        leftCell.push(leftImg);
      }
    }
    const rightSrc = cols[1] || null;
    const rightCell = [];
    if (rightSrc) {
      Array.from(rightSrc.querySelectorAll(":scope > h3, :scope > p, :scope > span, :scope > a")).forEach((node) => rightCell.push(node));
    }
    const cells = [];
    const heading = element.querySelector(":scope > h2");
    if (heading) cells.push([heading, ""]);
    cells.push([leftCell.length ? leftCell : "", rightCell.length ? rightCell : ""]);
    const block = WebImporter.Blocks.createBlock(document2, { name: "columns-media", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-video.js
  function parse5(element, { document: document2 }) {
    const cards = Array.from(element.querySelectorAll(":scope > .grid-item"));
    const cells = [];
    cards.forEach((card) => {
      const content = card.querySelector(":scope > .content") || card;
      const imageLink = content.querySelector("a.article-link");
      const image = content.querySelector("img");
      const imageCell = imageLink || image || "";
      const textCell = [];
      const tag = content.querySelector(".article-content a.tag, a.tag");
      if (tag) textCell.push(tag);
      const heading = content.querySelector(".article-content h3, h3");
      if (heading) textCell.push(heading);
      const description = card.querySelector(".article-hover p");
      if (description) textCell.push(description);
      if (image || textCell.length) {
        cells.push([imageCell, textCell]);
      }
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-video", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-covers.js
  function parse6(element, { document: document2 }) {
    const tiles = Array.from(element.querySelectorAll(":scope > .grid-item"));
    const cells = [];
    tiles.forEach((tile) => {
      const mainLink = tile.querySelector("a.main-link");
      const image = tile.querySelector("img");
      let imageCell = image || "";
      if (mainLink && image) {
        const linkWrap = mainLink.cloneNode(false);
        linkWrap.appendChild(image.cloneNode(true));
        imageCell = linkWrap;
      }
      const textCell = [];
      const title = tile.querySelector(".content h3, h3");
      if (title) textCell.push(title);
      const mobile = tile.querySelector(".mobile-links");
      if (mobile) {
        textCell.push(mobile);
      } else {
        const spanCta = tile.querySelector(".content .btn, .btn");
        if (spanCta && mainLink && mainLink.getAttribute("href")) {
          const a = document2.createElement("a");
          a.setAttribute("href", mainLink.getAttribute("href"));
          a.textContent = spanCta.textContent.trim();
          textCell.push(a);
        }
      }
      if (image || textCell.length) {
        cells.push([imageCell, textCell]);
      }
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-covers", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel-promo.js
  function parse7(element, { document: document2 }) {
    const slides = Array.from(element.querySelectorAll(":scope > .caro-item"));
    const cells = [];
    slides.forEach((slide) => {
      const link = slide.querySelector("a[href]");
      const image = slide.querySelector("img");
      if (!image) return;
      let imageCell = image;
      if (link) {
        const linkWrap = link.cloneNode(false);
        linkWrap.appendChild(image.cloneNode(true));
        imageCell = linkWrap;
      }
      cells.push([imageCell, ""]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "carousel-promo", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/petersenshunting-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#currentSubscribers",
        "#sub-modal-container",
        "#newsletter-modal-container"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        // Header / main navigation / masthead (auto-populated site shell).
        // Found in cleaned.html: <div id="MainNav_MainNavigationControl_magazineMainNavPanel"> wrapping <header class="masthead">
        "#MainNav_MainNavigationControl_magazineMainNavPanel",
        "header.masthead",
        // Footer (auto-populated site shell).
        // Found in cleaned.html: <div id="FooterNavigation_magazineFooterPanel"> and <footer>
        "#FooterNavigation_magazineFooterPanel",
        "footer",
        // Ad slots. Found in cleaned.html: <section class="ad-wrapper ..."> and <div id="adpos_top|rightA|bottomA|bottomB|bottom">
        "section.ad-wrapper",
        '[id^="adpos_"]',
        // ASP.NET WebForms hidden state fields. Found in cleaned.html: <div class="aspNetHidden">
        ".aspNetHidden",
        // Accessibility skip links. Found in cleaned.html: <a class="sr-only sr-only-focusable">Skip to main content</a>
        "a.sr-only-focusable",
        // Safe leftover / non-authorable elements.
        "link",
        "noscript"
      ]);
    }
  }

  // tools/importer/transformers/petersenshunting-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  function sectionSelector(section) {
    return Array.isArray(section.selector) ? section.selector[0] : section.selector;
  }
  function transform2(hookName, element, payload) {
    const sections = payload.template && payload.template.sections || [];
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (i === 0 && !section.style) continue;
        const sectionEl = element.querySelector(sectionSelector(section));
        if (!sectionEl) continue;
        const hr = document.createElement("hr");
        if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!section.style) continue;
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const anchor = marker || element.querySelector(sectionSelector(section));
        if (!anchor) continue;
        const metadataBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        anchor.after(metadataBlock);
        if (marker) {
          marker.removeAttribute(SECTION_MARKER_ATTR);
          if (i === 0) marker.remove();
        }
      }
    }
  }

  // tools/importer/import-homepage.js
  var parsers = {
    "video-embed": parse,
    "cards-articles": parse2,
    "carousel-shows": parse3,
    "columns-media": parse4,
    "cards-video": parse5,
    "cards-covers": parse6,
    "carousel-promo": parse7
  };
  var PAGE_TEMPLATE = {
    name: "homepage",
    description: "Petersen's Hunting homepage - magazine landing page with latest articles, featured video, recent videos carousel, digital single issue purchase, related magazines grid, and special interest magazines grid.",
    urls: [
      "http://localhost:8899/home-local.html"
    ],
    blocks: [
      {
        name: "video-embed",
        instances: [".home-sidebar-video .is-fixed"]
      },
      {
        name: "cards-articles",
        instances: [".grid.default-grid.four-wide.latest-articles"]
      },
      {
        name: "carousel-shows",
        instances: [".caro.wide.feature.caps-feature"]
      },
      {
        name: "columns-media",
        instances: [
          "section.wrapper.home-video-promo.clearfix",
          "section.wrapper.buy-issue"
        ]
      },
      {
        name: "cards-video",
        instances: [".row.flex-grid.video-grid"]
      },
      {
        name: "cards-covers",
        instances: [
          "section#FooterMagazineGlobal_getmagazineSection.has-prods-container .row.has-prods",
          "section#FooterMagazineGlobal_specialinterestSection.has-prods-container .row.has-prods"
        ]
      },
      {
        name: "carousel-promo",
        instances: ["div.wrapper > .caro.multi"]
      }
    ],
    sections: [
      { id: "section-1", name: "Latest Articles", selector: ["section.wrapper.has-grid.lastest-articles.clearfix:nth-of-type(1)"], style: null, blocks: ["video-embed", "cards-articles"], defaultContent: ["section.wrapper.has-grid.lastest-articles.clearfix:nth-of-type(1) > h2"] },
      { id: "section-2", name: "Watch", selector: ["div.wrapper.no-padding-bottom"], style: null, blocks: ["carousel-shows"], defaultContent: ["div.wrapper.no-padding-bottom h2"] },
      { id: "section-3", name: "Hunting Adventures TV", selector: ["section.wrapper.home-video-promo.clearfix"], style: null, blocks: ["columns-media"], defaultContent: ["section.wrapper.home-video-promo.clearfix h2"] },
      { id: "section-4", name: "Recent Videos", selector: ["section.wrapper.has-grid.lastest-articles.clearfix:nth-of-type(2)"], style: null, blocks: ["cards-video"], defaultContent: ["section.wrapper.has-grid.lastest-articles.clearfix:nth-of-type(2) h2"] },
      { id: "section-5", name: "Get the Magazine", selector: ["div.wrapper.narrow"], style: null, blocks: [], defaultContent: ["div.wrapper.narrow h2", "div.wrapper.narrow p", "div.wrapper.narrow a"] },
      { id: "section-6", name: "Buy Digital Single Issues", selector: ["section.wrapper.buy-issue"], style: null, blocks: ["columns-media"], defaultContent: ["section.wrapper.buy-issue h2"] },
      { id: "section-7", name: "Other Magazines", selector: ["section#FooterMagazineGlobal_getmagazineSection.has-prods-container"], style: null, blocks: ["cards-covers"], defaultContent: ["section#FooterMagazineGlobal_getmagazineSection h2"] },
      { id: "section-8", name: "Special Interest Magazines", selector: ["section#FooterMagazineGlobal_specialinterestSection.has-prods-container"], style: null, blocks: ["cards-covers"], defaultContent: ["section#FooterMagazineGlobal_specialinterestSection h2"] },
      { id: "section-9", name: "More You May Be Interested In", selector: ["div.wrapper > .caro.multi"], style: null, blocks: ["carousel-promo"], defaultContent: ["div.wrapper .caro.multi"] }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document2, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document2.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_homepage_default = {
    transform: (payload) => {
      const {
        document: document2,
        url,
        html,
        params
      } = payload;
      const main = document2.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document2, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document: document2, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document2.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document2);
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_homepage_exports);
})();
