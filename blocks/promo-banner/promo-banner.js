import { loadFragment } from '../fragment/fragment.js';
import initPromoScheduler from '../../scripts/promo-scheduler.js';

export default async function decorate(block) {
  // The block contains a link to the promo-scheduler JSON, e.g.:
  //   /fragments/promo-scheduler.json
  // We read that URL, run the scheduler, then replace the block with
  // the winning fragment's decorated content.
  const link = block.querySelector('a');
  const schedulerUrl = link ? link.getAttribute('href') : block.textContent.trim();

  if (!schedulerUrl) return;

  const fragmentPath = await resolvePromoFragment(schedulerUrl);
  if (!fragmentPath) return;

  const fragment = await loadFragment(fragmentPath);
  if (fragment) {
    const fragmentSection = fragment.querySelector(':scope .section');
    if (fragmentSection) {
      block.closest('.section').classList.add(...fragmentSection.classList);
      block.closest('.promo-banner').replaceWith(...fragment.childNodes);
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers (same logic as scripts/promo-scheduler.js but returns the
// chosen path rather than injecting HTML, so we can use loadFragment instead).
// ---------------------------------------------------------------------------

const DATE_KEY = 'url.date';

function getEffectiveDate() {
  const params = new URLSearchParams(window.location.search);
  const urlDate = params.get(DATE_KEY);
  if (urlDate) {
    sessionStorage.setItem(DATE_KEY, urlDate);
    return new Date(urlDate);
  }
  const stored = sessionStorage.getItem(DATE_KEY);
  if (stored) return new Date(stored);
  return new Date();
}

async function resolvePromoFragment(schedulerUrl) {
  let resp;
  try {
    resp = await fetch(schedulerUrl);
  } catch {
    return null;
  }
  if (!resp.ok) return null;

  const { data } = await resp.json();
  const now = getEffectiveDate();

  let match = null;
  let fallback = null;

  for (const row of data) {
    const start = row.start ? new Date(row.start) : null;
    const end = row.end ? new Date(row.end) : null;
    const fragment = row['fragment URL'] || row.fragment || '';

    if (!fragment) continue;

    if (!start && !end) {
      if (!fallback) fallback = fragment;
      continue;
    }

    if (start && end && now >= start && now < end) {
      match = fragment;
      break;
    }
  }

  return match || fallback || null;
}
