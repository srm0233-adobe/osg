/* Block: newsletter — reusable email-signup band.
 * Authored as a single-cell block whose content is, in order:
 *   heading (eyebrow <em> + title), description <p>, email placeholder <p>,
 *   and a CTA link (decorated by EDS as p.button-container > a.button).
 * The decorator lifts that content up to the block root and marks the email
 * placeholder paragraph so the CSS can render it as an input field. */
export default function decorate(block) {
  // Unwrap the authored row/cell wrappers so the content sits directly in the
  // block (EDS shape: block > div(row) > div(cell) > content).
  const cell = block.querySelector(':scope > div > div') || block.querySelector(':scope > div');
  if (cell && cell !== block) {
    [...cell.childNodes].forEach((node) => block.append(node));
    // remove the now-empty wrapper row(s)
    [...block.children].forEach((child) => {
      if (child.tagName === 'DIV' && child.textContent.trim() === '' && !child.querySelector('img, a')) {
        child.remove();
      }
    });
  }

  // The email field is the last plain (link-free) paragraph before the CTA
  // button — mark it so the CSS can render it as an input field.
  const bareParagraphs = [...block.querySelectorAll(':scope > p')]
    .filter((p) => !p.classList.contains('button-container') && !p.querySelector('a'));
  const emailP = bareParagraphs[bareParagraphs.length - 1];
  if (emailP) emailP.classList.add('newsletter-email');

  // Wrap the content in a fixed-width inner column so it centers horizontally
  // in the full-width band while its text stays left-aligned.
  const inner = document.createElement('div');
  inner.className = 'newsletter-inner';
  inner.append(...block.childNodes);
  block.append(inner);
}
