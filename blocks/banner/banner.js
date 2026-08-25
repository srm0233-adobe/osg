import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];

  let imageCell = null;
  let bodyCell = null;
  let mbox = null;

  rows.forEach((row) => {
    const cells = [...row.children];
    // Mbox metadata row: first cell text is "mbox" (case-insensitive)
    if (cells.length === 2 && cells[0].textContent.trim().toLowerCase() === 'mbox') {
      mbox = cells[1].textContent.trim();
      row.remove();
      return;
    }
    cells.forEach((cell) => {
      if (!imageCell && cell.querySelector('picture, img')) imageCell = cell;
      else if (!bodyCell) bodyCell = cell;
    });
  });

  // Expose mbox as a data attribute so at.js can target this element
  if (mbox) block.dataset.mbox = mbox;

  block.innerHTML = '';

  if (imageCell) {
    imageCell.className = 'banner-image';
    imageCell.querySelectorAll('picture > img').forEach((img) => {
      const widths = block.classList.contains('medium-rectangle')
        ? [{ width: '300' }]
        : [{ width: '1200' }, { media: '(min-width: 900px)', width: '1200' }];
      img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, widths));
    });
    block.append(imageCell);
  }

  if (bodyCell) {
    bodyCell.className = 'banner-body';
    bodyCell.querySelectorAll('a').forEach((a) => a.classList.add('button'));
    block.append(bodyCell);
  }
}
