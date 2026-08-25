/**
 * Option A (no tag manager): load Target's at.js from URLs in page metadata.
 *
 * Required when using real Target:
 *   <meta name="target" content="1"/>
 *   <meta name="target-at-js" content="https://…/at.js"/>
 *
 * Optional (only if your Adobe implementation snippet includes a visitor/ECID
 * script that must run before at.js):
 *   <meta name="target-visitor-js" content="https://…/VisitorAPI.js"/>
 *
 * You can host the file(s) you downloaded from Target (Administration → Implementation
 * → Download) on your CDN or under /deps/at/ and point content at that URL.
 *
 * If `target-at-js` is omitted, a stub getOffers runs (empty offers) so local dev still works.
 */
import { getMetadata } from '../../scripts/aem.js';

/** @param {string} src */
function assertAllowedScriptSrc(src) {
  const url = new URL(src, window.location.href);
  if (url.protocol === 'https:') return;
  if (url.protocol === 'http:' && url.origin === window.location.origin) return;
  throw new Error('target-at-js / target-visitor-js must be https or same-origin http');
}

/** @param {string} src */
function loadScript(src) {
  assertAllowedScriptSrc(src);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.append(s);
  });
}

function installStub() {
  if (!window.adobe) window.adobe = {};
  if (window.adobe.target?.getOffers) return;
  window.adobe.target = {
    async getOffers() {
      return { execute: {} };
    },
  };
}

async function ensureRealAtJs() {
  if (window.adobe?.target?.getOffers) return;

  const atJs = getMetadata('target-at-js')?.trim();
  const visitor = getMetadata('target-visitor-js')?.trim();

  if (!atJs) {
    installStub();
    return;
  }

  if (visitor) await loadScript(visitor);
  await loadScript(atJs);

  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (window.adobe?.target?.getOffers) return;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 50));
  }

  throw new Error('Loaded target-at-js but window.adobe.target.getOffers is still missing');
}

await ensureRealAtJs();
