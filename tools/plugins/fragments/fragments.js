import DA_SDK from 'https://da.live/nx/utils/sdk.js';

const DA_ORIGIN = 'https://admin.da.live';

/**
 * The brand fragments folder for the page currently open in DA.
 *
 * The user asked: while anywhere in `magazines/<brand>`, the picker should list
 * that brand's fragments (`magazines/<brand>/fragments`). We derive the brand
 * folder from the open document's path so the same plugin works for every
 * brand (bowhunter, petersen-hunting, …). Falls back to a site-root
 * `/fragments` folder when the page isn't under a magazines/<brand> path.
 * @param {string} path e.g. "/magazines/bowhunter/editorial/some-article"
 * @returns {string} DA folder path e.g. "/magazines/bowhunter/fragments"
 */
function fragmentsFolder(path) {
  const m = (path || '').match(/^\/(magazines\/[^/]+)\//);
  return m ? `/${m[1]}/fragments` : '/fragments';
}

/** Insert the chosen fragment as a Fragment block: a link the fragment block
 *  resolves at render time. Two-cell block table = `fragment` block. */
function fragmentBlockHTML(href) {
  return `<table><tr><th>fragment</th></tr><tr><td><a href="${href}">${href}</a></td></tr></table>`;
}

(async function init() {
  const { context, actions } = await DA_SDK;
  const { org, repo, path } = context;
  const statusEl = document.querySelector('.fragments-status');
  const listEl = document.querySelector('.fragments-list');

  const folder = fragmentsFolder(path);
  const listUrl = `${DA_ORIGIN}/list/${org}/${repo}${folder}`;

  let items = [];
  try {
    const resp = await actions.daFetch(listUrl);
    if (!resp.ok) throw new Error(`list ${resp.status}`);
    items = (await resp.json())
      .filter((it) => it.ext === 'html')
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    statusEl.textContent = `Could not load fragments from ${folder}.`;
    return;
  }

  if (!items.length) {
    statusEl.textContent = `No fragments found in ${folder}.`;
    return;
  }

  statusEl.textContent = `${items.length} fragment${items.length === 1 ? '' : 's'} in ${folder}`;
  listEl.hidden = false;

  items.forEach((it) => {
    // The authorable reference is the page path (no .html, no org/repo prefix).
    const href = `${folder}/${it.name}`;
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fragment-item';
    btn.innerHTML = `<span class="fragment-name">${it.name}</span><span class="fragment-path">${href}</span>`;
    btn.addEventListener('click', () => {
      actions.sendHTML(fragmentBlockHTML(href));
      actions.closeLibrary();
    });
    li.append(btn);
    listEl.append(li);
  });
}());
