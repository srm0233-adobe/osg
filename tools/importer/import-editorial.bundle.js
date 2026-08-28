var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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

  // tools/importer/import-editorial.js
  var import_editorial_exports = {};
  __export(import_editorial_exports, {
    default: () => import_editorial_default
  });

  // tools/importer/transformers/petersenshunting-editorial-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      element.querySelectorAll("span > span:only-child").forEach((inner) => {
        inner.replaceWith(...inner.childNodes);
      });
      element.querySelectorAll("figure").forEach((fig) => {
        const img = fig.querySelector("img");
        if (!img) return;
        const figcaption = fig.querySelector("figcaption");
        const fragment = document.createDocumentFragment();
        fragment.appendChild(img);
        if (figcaption && figcaption.textContent.trim()) {
          const p = document.createElement("p");
          const em = document.createElement("em");
          while (figcaption.firstChild) em.appendChild(figcaption.firstChild);
          p.appendChild(em);
          fragment.appendChild(p);
        }
        fig.replaceWith(fragment);
      });
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "nav.sub-nav.bread-container",
        // Safe leftover / non-authorable elements (present in raw source head/body).
        "link",
        "noscript"
      ]);
      element.querySelectorAll("[itemscope], [itemtype], [itemprop], [property], [content]").forEach((el) => {
        el.removeAttribute("itemscope");
        el.removeAttribute("itemtype");
        el.removeAttribute("itemprop");
        el.removeAttribute("property");
        el.removeAttribute("content");
      });
    }
  }

  // tools/importer/transformers/petersenshunting-editorial-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  var SECTIONS = [
    {
      id: "section-1",
      name: "Article Body",
      selector: "article#article01",
      style: null
    },
    {
      id: "section-2",
      name: "Author Bio",
      selector: "div.bio-editorial.row.first-xs",
      style: "author-bio"
    }
  ];
  function transform2(hookName, element, payload) {
    if (hookName === "beforeTransform") {
      for (let i = SECTIONS.length - 1; i >= 1; i -= 1) {
        const section = SECTIONS[i];
        const sectionEl = element.querySelector(section.selector);
        if (!sectionEl) continue;
        const hr = document.createElement("hr");
        if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = SECTIONS.length - 1; i >= 0; i -= 1) {
        const section = SECTIONS[i];
        if (!section.style) continue;
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const sectionEl = element.querySelector(section.selector);
        if (!sectionEl && !marker) continue;
        const metadataBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        if (sectionEl) {
          sectionEl.after(metadataBlock);
        } else {
          marker.after(metadataBlock);
        }
        if (marker) marker.removeAttribute(SECTION_MARKER_ATTR);
      }
    }
  }

  // tools/importer/import-editorial.js
  var PAGE_TEMPLATE = {
    name: "editorial-article",
    description: "Editorial article detail page - breadcrumb, headline, deck, hero image with caption, publish date/byline, long-form body with subheadings and inline captioned images, and author bio.",
    urls: ["http://localhost:8899/ammovault-raw.html"],
    blocks: []
  };
  var TARGET_PATH = "/petersen-hunting/editorial/ammovault-ammunition-reserve";
  var transformers = [transform, transform2];
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
  var import_editorial_default = {
    transform: (payload) => {
      const {
        document: document2,
        url,
        html,
        params
      } = payload;
      const main = document2.body;
      executeTransformers("beforeTransform", main, payload);
      executeTransformers("afterTransform", main, payload);
      WebImporter.rules.createMetadata(main, document2);
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(TARGET_PATH);
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: []
        }
      }];
    }
  };
  return __toCommonJS(import_editorial_exports);
})();
