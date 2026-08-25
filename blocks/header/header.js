// Petersen's Hunting header — content-first nav.
// Fetches content/nav.plain.html (flat semantic fragment) and builds:
//   - utility bar (social links + subscribe links)
//   - masthead (logo + search + hamburger)
//   - main nav bar (top-level links with hover/click dropdowns)
// All copy/links/images come from the fragment; this file only reads + wires behavior.

const isDesktop = window.matchMedia('(min-width: 900px)');

// Search category options (from source select) — a control, built here per the fragment contract.
const SEARCH_CATEGORIES = [
  'All', 'Special Interest', 'Wily Whitetails', 'Hog Week', 'More Than The Hunt',
  'Whitetail', 'Trending', 'PH TV Adventures', 'Everything Elk', 'Wheels Afield',
  'Ultimate Season', 'SHOT Show', 'Hunting', 'Gear', 'Learn', 'Destinations', 'Recipes',
];

function closeAllDropdowns(nav) {
  nav.querySelectorAll('.nav-item[aria-expanded="true"]').forEach((li) => {
    li.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Build the header DOM from the fetched nav fragment.
 * @param {HTMLElement} fragment parsed nav.plain.html container
 * @param {HTMLElement} block the header block element
 */
function buildNav(fragment, block) {
  const sections = fragment.querySelectorAll(':scope > div');
  const brandSection = sections[0];
  const navSection = sections[1];

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');

  // --- Utility bar (social + subscribe lists from the brand section) ---
  const utilBar = document.createElement('div');
  utilBar.className = 'nav-utility';
  const utilInner = document.createElement('div');
  utilInner.className = 'nav-utility-inner';
  const lists = brandSection ? brandSection.querySelectorAll('ul') : [];
  if (lists[0]) {
    const social = lists[0].cloneNode(true);
    social.className = 'nav-social';
    utilInner.append(social);
  }
  if (lists[1]) {
    const subscribe = lists[1].cloneNode(true);
    subscribe.className = 'nav-subscribe';
    utilInner.append(subscribe);
  }
  utilBar.append(utilInner);
  nav.append(utilBar);

  // --- Masthead (hamburger + logo + search) ---
  const masthead = document.createElement('div');
  masthead.className = 'nav-masthead';
  const mastheadInner = document.createElement('div');
  mastheadInner.className = 'nav-masthead-inner';

  const hamburger = document.createElement('button');
  hamburger.className = 'nav-hamburger';
  hamburger.type = 'button';
  hamburger.setAttribute('aria-label', 'Open navigation');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.innerHTML = '<span class="nav-hamburger-icon"></span>';
  mastheadInner.append(hamburger);

  const brandLink = brandSection ? brandSection.querySelector('p a') : null;
  if (brandLink) {
    const brand = document.createElement('div');
    brand.className = 'nav-brand';
    brand.append(brandLink.cloneNode(true));
    mastheadInner.append(brand);
  }

  masthead.append(mastheadInner);
  nav.append(masthead);

  // Search form (control built here per fragment contract). Rendered in its own
  // full-width row BELOW the main nav, matching the source layout.
  const searchRow = document.createElement('div');
  searchRow.className = 'nav-search-row';
  const searchInner = document.createElement('div');
  searchInner.className = 'nav-search-inner';
  const search = document.createElement('form');
  search.className = 'nav-search';
  search.setAttribute('role', 'search');
  search.action = '/search';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Search category');
  SEARCH_CATEGORIES.forEach((cat) => {
    const opt = document.createElement('option');
    opt.textContent = cat;
    select.append(opt);
  });
  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'q';
  input.placeholder = 'What are you looking for?';
  input.setAttribute('aria-label', 'Search');
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.setAttribute('aria-label', 'Submit search');
  submit.textContent = 'Search';
  search.append(select, input, submit);
  searchInner.append(search);
  searchRow.append(searchInner);

  // --- Main nav bar (top-level links + dropdowns) ---
  const navBar = document.createElement('div');
  navBar.className = 'nav-main';
  const navBarInner = document.createElement('div');
  navBarInner.className = 'nav-main-inner';
  const topList = navSection ? navSection.querySelector(':scope > ul') : null;
  if (topList) {
    const list = document.createElement('ul');
    list.className = 'nav-list';
    Array.from(topList.children).forEach((li) => {
      const item = document.createElement('li');
      item.className = 'nav-item';
      const topLink = li.querySelector(':scope > a');
      const submenu = li.querySelector(':scope > ul');
      if (topLink) item.append(topLink.cloneNode(true));
      if (submenu) {
        item.classList.add('nav-item-has-drop');
        item.setAttribute('aria-expanded', 'false');
        const toggle = document.createElement('button');
        toggle.className = 'nav-drop-toggle';
        toggle.type = 'button';
        toggle.setAttribute('aria-label', `Toggle ${topLink ? topLink.textContent.trim() : ''} submenu`);
        item.append(toggle);
        const drop = submenu.cloneNode(true);
        drop.className = 'nav-drop';
        item.append(drop);

        // Desktop: hover opens/closes
        item.addEventListener('mouseenter', () => {
          if (isDesktop.matches) item.setAttribute('aria-expanded', 'true');
        });
        item.addEventListener('mouseleave', () => {
          if (isDesktop.matches) item.setAttribute('aria-expanded', 'false');
        });
        // Mobile: chevron toggles submenu; the text link still navigates
        toggle.addEventListener('click', (e) => {
          e.preventDefault();
          const open = item.getAttribute('aria-expanded') === 'true';
          if (!isDesktop.matches) {
            list.querySelectorAll('.nav-item[aria-expanded="true"]').forEach((s) => {
              if (s !== item) s.setAttribute('aria-expanded', 'false');
            });
          }
          item.setAttribute('aria-expanded', open ? 'false' : 'true');
        });
      }
      list.append(item);
    });
    navBarInner.append(list);
  }
  navBar.append(navBarInner);
  nav.append(navBar);

  // Search row sits below the main nav (matches source layout)
  nav.append(searchRow);

  // --- Hamburger behavior ---
  hamburger.addEventListener('click', () => {
    const open = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', open ? 'false' : 'true');
    hamburger.setAttribute('aria-label', open ? 'Open navigation' : 'Close navigation');
    nav.classList.toggle('nav-open', !open);
    document.body.classList.toggle('nav-menu-open', !open);
  });

  // Close desktop dropdowns on Escape
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') closeAllDropdowns(nav);
  });

  // Viewport resize handling: reset state when crossing breakpoints
  isDesktop.addEventListener('change', () => {
    closeAllDropdowns(nav);
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('nav-open');
    document.body.classList.remove('nav-menu-open');
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  wrapper.append(nav);
  block.textContent = '';
  block.append(wrapper);
}

/**
 * loads and decorates the header nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // Dual-fetch: localhost / aem up first, DA/EDS production fallback.
  const navPath = block.querySelector('a')?.getAttribute('href') || '/content/nav';
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) {
    resp = await fetch(`${navPath}.plain.html`);
  }
  if (!resp.ok) return;
  const html = await resp.text();
  const fragment = document.createElement('div');
  fragment.innerHTML = html;
  buildNav(fragment, block);
}
