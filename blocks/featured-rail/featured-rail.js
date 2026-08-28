// featured-rail — sticky right-hand sidebar for the home "Latest Articles"
// section. Row 1 is the magazine "Preview This Month's Issue" promo; the
// remaining rows form the "Featured Video" widget (label, thumbnail, CTA).
// Sits in a fixed-width column beside the cards mosaic via the
// .latest-has-rail section layout (see styles.css).
export default function decorate(block) {
  [...block.children].forEach((row, idx) => {
    if (idx === 0) row.classList.add('featured-rail-magazine');
    else row.classList.add('featured-rail-video');
  });
}
