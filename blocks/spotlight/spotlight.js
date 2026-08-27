// Advertisement block — a grey-backed banner slot that rotates through ad
// creatives on a timer (carousel). Content-first: each row of the block is one
// ad; a cell with a link makes the ad clickable, otherwise it's a static image.
// The "Advertisement" label and rotation behaviour are added here.

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
  const dots = block.querySelectorAll('.spotlight-dot');
  dots.forEach((dot, i) => {
    const active = i === realIndex;
    dot.setAttribute('aria-current', active ? 'true' : 'false');
    if (active) dot.setAttribute('disabled', 'true');
    else dot.removeAttribute('disabled');
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

  // Rotation controls: dots for multiple ads.
  let timer;
  const startTimer = () => {
    if (ads.length < 2) return;
    timer = setInterval(() => {
      showAd(block, parseInt(block.dataset.activeAd || '0', 10) + 1);
    }, ROTATE_INTERVAL);
  };
  const resetTimer = () => {
    clearInterval(timer);
    startTimer();
  };

  if (ads.length > 1) {
    const dots = document.createElement('div');
    dots.className = 'spotlight-dots';
    dots.setAttribute('role', 'tablist');
    dots.setAttribute('aria-label', 'Advertisement selector');
    ads.forEach((ad, idx) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'spotlight-dot';
      dot.setAttribute('aria-label', `Show spotlight ${idx + 1} of ${ads.length}`);
      dot.addEventListener('click', () => {
        showAd(block, idx);
        resetTimer();
      });
      dots.append(dot);
    });
    block.append(dots);

    // Pause rotation on hover/focus so users can read/click.
    block.addEventListener('mouseenter', () => clearInterval(timer));
    block.addEventListener('mouseleave', startTimer);
    block.addEventListener('focusin', () => clearInterval(timer));
    block.addEventListener('focusout', startTimer);
  }

  showAd(block, 0);
  startTimer();
}
