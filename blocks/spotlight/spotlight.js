// Advertisement block — a grey-backed banner slot that rotates through ad
// creatives on a timer. Content-first: each row of the block is one ad; a cell
// with a link makes the ad clickable, otherwise it's a static image. The
// "Advertisement" label and automatic rotation are added here. Rotation is
// timer-only — no manual navigation controls.

const ROTATE_INTERVAL = 6000; // ms between ads

function showAd(block, index) {
  const ads = block.querySelectorAll('.spotlight-item');
  if (!ads.length) return;
  const realIndex = ((index % ads.length) + ads.length) % ads.length;
  block.dataset.activeAd = realIndex;
  ads.forEach((ad, i) => {
    const active = i === realIndex;
    ad.classList.toggle('spotlight-item-active', active);
    ad.setAttribute('aria-hidden', active ? 'false' : 'true');
    ad.querySelectorAll('a').forEach((link) => {
      if (active) link.removeAttribute('tabindex');
      else link.setAttribute('tabindex', '-1');
    });
  });
}

export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];

  // Build the ad track from the authored rows.
  const track = document.createElement('div');
  track.className = 'spotlight-track';

  rows.forEach((row, idx) => {
    const ad = document.createElement('div');
    ad.className = 'spotlight-item';
    ad.dataset.adIndex = idx;
    // Move the row's content (image and/or link) into the ad slot.
    [...row.childNodes].forEach((node) => ad.append(node));
    track.append(ad);
    row.remove();
  });

  // "Advertisement" label above the creative, matching the source.
  const label = document.createElement('p');
  label.className = 'spotlight-label';
  label.textContent = 'Advertisement';

  block.append(label);
  block.append(track);

  const ads = track.querySelectorAll('.spotlight-item');
  if (ads.length === 0) return;

  showAd(block, 0);

  // Auto-rotate on a timer when there is more than one ad. No manual controls —
  // ads advance automatically (and a fresh page load starts from the first).
  if (ads.length > 1) {
    setInterval(() => {
      showAd(block, parseInt(block.dataset.activeAd || '0', 10) + 1);
    }, ROTATE_INTERVAL);
  }
}
