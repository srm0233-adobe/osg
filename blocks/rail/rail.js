// rail — right-hand sidebar for article pages. The first row is a sidebar
// advertisement (gets an "Advertisement" label); any following rows are promo
// content (e.g. a subscribe card). The block sits in a fixed-width column
// beside the article body via the .has-rail section layout (see styles.css).

export default function decorate(block) {
  [...block.children].forEach((row, idx) => {
    if (idx === 0) {
      row.classList.add('rail-ad');
      const label = document.createElement('p');
      label.className = 'rail-ad-label';
      label.textContent = 'Advertisement';
      row.prepend(label);
    } else {
      row.classList.add('rail-promo');
    }
  });
}
