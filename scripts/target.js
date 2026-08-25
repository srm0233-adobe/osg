import { getMetadata } from './aem.js';

/** AEM Universal Editor iframe; skip Target so at.js does not fight UE/CSP. */
export function isUePreviewHost(hostname = window.location.hostname) {
  return /\.(?:stage-ue|ue)\.da\.live$/.test(hostname);
}

/**
 * @param {unknown} e
 * @param {Element} [el]
 */
function logTargetError(e, el) {
  // eslint-disable-next-line no-console
  console.error('[target]', e, el);
}

export async function loadTarget() {
  if (isUePreviewHost()) return;
  const targetMeta = getMetadata('target');
  if (!targetMeta) return;

  const serverDomain = getMetadata('target-server-domain')?.trim();
  window.targetGlobalSettings = {
    secureOnly: true,
    overrideMboxEdgeServer: false,
    ...(serverDomain ? { serverDomain } : {}),
  };

  try {
    await import('../deps/at/at.js');
    const pageLoadRequest = { execute: { pageLoad: {} } };
    const offers = await window.adobe.target.getOffers({
      request: pageLoadRequest,
    });

    if (typeof window.adobe.target.applyOffers === 'function') {
      await window.adobe.target.applyOffers({
        request: pageLoadRequest,
        response: offers,
      });
    } else {
      offers?.execute?.pageLoad?.options?.forEach((opt) => {
        const payload = opt?.content?.[0];
        if (!payload) return;
        const { cssSelector, content } = payload;
        if (!cssSelector || content == null) return;
        const el = document.querySelector(cssSelector);
        if (el) el.outerHTML = content;
      });
    }
  } catch (e) {
    logTargetError(e, document.body);
  }
}

/**
 * Legacy mbox flow (getOffer + applyOffer). Runs after blocks render.
 * Opt-in via meta target-mbox-hero and optional target-mbox-hero-selector.
 */
export async function applyTargetHeroMboxIfConfigured() {
  if (isUePreviewHost()) return;
  const mbox = getMetadata('target-mbox-hero')?.trim();
  if (!mbox) return;

  const selectorList = (getMetadata('target-mbox-hero-selector')?.trim()
    || '.hero-promo, .hero.block .hero-inner')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const t = window.adobe?.target;
  if (!t?.getOffer || !t?.applyOffer) return;

  const resolveSelector = () => {
    for (let i = 0; i < selectorList.length; i += 1) {
      const el = document.querySelector(selectorList[i]);
      if (el) return { el, selector: selectorList[i] };
    }
    return null;
  };

  await new Promise((resolve) => {
    t.getOffer({
      mbox,
      success(offers) {
        const match = resolveSelector();
        if (!match) {
          resolve();
          return;
        }
        t.applyOffer({ mbox, selector: match.selector, offer: offers });
        resolve();
      },
      error: resolve,
    });
  });
}
