// rail — right-hand sidebar for article pages. The first row is a sidebar
// advertisement; any following rows are promo content (e.g. a subscribe card).
// The ad row may hold several creatives (one per cell) — they are shown one at
// a time and rotated on a timer. The block sits in a fixed-width column beside
// the article body via the .has-rail section layout (see styles.css).

const ROTATE_INTERVAL = 6000; // ms between ad creatives

function showAd(ad, index) {
  const slides = ad.querySelectorAll('.rail-ad-slide');
  if (!slides.length) return;
  const real = ((index % slides.length) + slides.length) % slides.length;
  ad.dataset.activeAd = real;
  slides.forEach((slide, i) => {
    const active = i === real;
    slide.classList.toggle('rail-ad-slide-active', active);
    slide.setAttribute('aria-hidden', active ? 'false' : 'true');
    slide.querySelectorAll('a').forEach((a) => {
      if (active) a.removeAttribute('tabindex');
      else a.setAttribute('tabindex', '-1');
    });
  });
}

export default function decorate(block) {
  [...block.children].forEach((row, idx) => {
    if (idx === 0) {
      // First row is the advertisement. Each cell is a creative slide.
      row.classList.add('rail-ad');
      const label = document.createElement('p');
      label.className = 'rail-ad-label';
      label.textContent = 'Advertisement';

      const slides = [...row.children];
      slides.forEach((cell) => cell.classList.add('rail-ad-slide'));
      row.prepend(label);

      showAd(row, 0);
      if (slides.length > 1) {
        let i = 0;
        const timer = setInterval(() => {
          if (!row.isConnected) { clearInterval(timer); return; }
          i += 1;
          showAd(row, i);
        }, ROTATE_INTERVAL);
      }
    } else {
      row.classList.add('rail-promo');
    }
  });
}
