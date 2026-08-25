import { getMetadata } from '../../scripts/aem.js';

/**
 * Adobe Target HTML offer slot.
 * - VEC / page-load: point activities at `.target-offer` or `[data-mbox-name="…"]`
 *   (see scripts.js applyTargetPageLoad after blocks load when `<meta name="target">` is set).
 * - Optional: first table row with a single cell = mbox name triggers a post-init
 *   getOffers request when real at.js is wired (deps/at/at.js).
 */

function directChildRowOf(el, node) {
  let row = node;
  while (row.parentElement && row.parentElement !== el) {
    row = row.parentElement;
  }
  return row.parentElement === el ? row : null;
}

function collectMboxFromFirstRow(rows) {
  if (rows.length < 2) return { mboxName: '', contentRows: rows };
  const cells = [...rows[0].querySelectorAll(':scope > div')];
  if (cells.length !== 1) return { mboxName: '', contentRows: rows };
  const text = cells[0].textContent.trim();
  if (!text) return { mboxName: '', contentRows: rows };
  return { mboxName: text, contentRows: rows.slice(1) };
}

/** @param {HTMLElement} el */
function buildSlot(el) {
  const mboxPara = el.querySelector('p.target-offer-mbox');
  let mboxName = '';
  const slot = document.createElement('div');
  slot.className = 'target-offer__slot';

  if (mboxPara) {
    mboxName = mboxPara.textContent.trim();
    const configRow = directChildRowOf(el, mboxPara);
    const defaultRoot = el.querySelector(':scope > .target-offer-default');
    if (configRow) configRow.remove();
    if (defaultRoot) {
      while (defaultRoot.firstChild) slot.append(defaultRoot.firstChild);
      defaultRoot.remove();
    }
  } else {
    const rows = [...el.querySelectorAll(':scope > div')];
    const parsed = collectMboxFromFirstRow(rows);
    mboxName = parsed.mboxName;
    const frag = document.createDocumentFragment();
    parsed.contentRows.forEach((row) => frag.append(row));
    if (parsed.mboxName && rows[0]?.parentElement === el) rows[0].remove();
    el.append(frag);
    while (el.firstChild) slot.append(el.firstChild);
  }

  el.append(slot);
  return { slot, mboxName };
}

async function applyMboxContent(slot, mboxName) {
  if (!mboxName || !window.adobe?.target?.getOffers) return;

  try {
    const response = await window.adobe.target.getOffers({
      request: {
        execute: {
          mboxes: [{ index: 0, name: mboxName }],
        },
      },
    });

    const mboxResult = response?.execute?.mboxes?.[0];
    const raw = mboxResult?.options?.[0]?.content;
    const html = Array.isArray(raw) ? raw[0] : raw;
    if (html == null || html === '') return;

    slot.innerHTML = typeof html === 'string' ? html : '';
  } catch (ex) {
    // eslint-disable-next-line no-console
    console.error(ex);
  }
}

export default async function init(el) {
  el.classList.add('target-offer--decorated');
  const exportSpan = el.querySelector(':scope > .target-offer-export-id');
  const exportId = (exportSpan?.textContent || el.dataset.targetExportId || '').trim();
  if (exportId) {
    el.dataset.exportId = exportId;
  }
  exportSpan?.remove();

  const { slot, mboxName } = buildSlot(el);
  if (mboxName) {
    el.dataset.mboxName = mboxName;
  }

  if (!getMetadata('target')) return;

  await applyMboxContent(slot, mboxName);
}
