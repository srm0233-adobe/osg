import DA_SDK from 'https://da.live/nx/utils/sdk.js';

const RUNTIME_URL = 'https://332794-868ceruleanwhale.adobeioruntime.net/api/v1/web/default/target-activities';

async function runtimeFetch(params) {
  const url = `${RUNTIME_URL}?${new URLSearchParams(params)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Runtime error: ${resp.status}`);
  return resp.json();
}

async function fetchActivities() {
  const { activities } = await runtimeFetch({});
  return activities ?? [];
}

async function fetchOffers() {
  const { offers } = await runtimeFetch({ resource: 'offers' });
  return offers ?? [];
}

async function fetchAudiences() {
  const { audiences } = await runtimeFetch({ resource: 'audiences' });
  return audiences ?? [];
}

async function createXtActivity({ name, mbox, offerId, audienceId }) {
  return runtimeFetch({
    resource: 'create-xt',
    name,
    mbox: mbox || 'target-global-mbox',
    offerId,
    ...(audienceId ? { audienceId } : {}),
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Create XT activity modal ────────────────────────────────────────────────

function field(label, input) {
  const wrap = document.createElement('div');
  wrap.className = 'form-field';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  wrap.append(lbl, input);
  return wrap;
}

async function showCreateXtModal(onCreated) {
  document.querySelector('.create-xt-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'offers-modal create-xt-modal';

  const panel = document.createElement('div');
  panel.className = 'offers-panel create-panel';

  const header = document.createElement('div');
  header.className = 'offers-header';
  header.innerHTML = '<h3>Create Experience Targeting Activity</h3>';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'offers-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => overlay.remove());
  header.append(closeBtn);

  const form = document.createElement('div');
  form.className = 'create-form';

  // Name
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'e.g. homepage-promo-june';
  form.append(field('Activity Name', nameInput));

  // Mbox
  const mboxInput = document.createElement('input');
  mboxInput.type = 'text';
  mboxInput.value = 'target-global-mbox';
  form.append(field('Mbox / Location', mboxInput));

  // Loading state for selects
  const loadingNote = document.createElement('p');
  loadingNote.className = 'loading';
  loadingNote.textContent = 'Loading offers and audiences…';
  form.append(loadingNote);

  const footer = document.createElement('div');
  footer.className = 'offers-footer';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-change';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => overlay.remove());
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-create';
  saveBtn.textContent = 'Create';
  saveBtn.disabled = true;
  footer.append(cancelBtn, saveBtn);

  panel.append(header, form, footer);
  overlay.append(panel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);

  // Load offers + audiences in parallel
  try {
    const [offers, audiences] = await Promise.all([fetchOffers(), fetchAudiences()]);
    loadingNote.remove();

    // Offer select
    const offerSel = document.createElement('select');
    offerSel.append(new Option('— select an offer —', ''));
    offers.forEach((o) => offerSel.append(new Option(o.name, o.id)));
    form.append(field('Offer', offerSel));

    // Audience select
    const audSel = document.createElement('select');
    audSel.append(new Option('All Visitors (no audience)', ''));
    audiences.forEach((a) => audSel.append(new Option(a.name, a.id)));
    form.append(field('Audience', audSel));

    saveBtn.disabled = false;

    saveBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      const mbox = mboxInput.value.trim() || 'target-global-mbox';
      const offerId = offerSel.value;
      const audienceId = audSel.value || null;

      if (!name) { nameInput.focus(); return; }
      if (!offerId) { offerSel.focus(); return; }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Creating…';

      const errEl = footer.querySelector('.offers-error') || (() => {
        const el = document.createElement('p');
        el.className = 'offers-error';
        footer.prepend(el);
        return el;
      })();
      errEl.textContent = '';

      try {
        const result = await createXtActivity({ name, mbox, offerId, audienceId });
        if (result.httpStatus >= 400 || result.error) {
          throw new Error(result.errors?.[0]?.message || result.error || 'Create failed');
        }
        overlay.remove();
        onCreated(result);
      } catch (err) {
        errEl.textContent = `Error: ${err.message}`;
        saveBtn.disabled = false;
        saveBtn.textContent = 'Create';
      }
    });
  } catch (err) {
    loadingNote.textContent = `Failed to load data: ${err.message}`;
  }
}

// ── Change experience / offers modal ───────────────────────────────────────

function showOffersModal(offers, activity) {
  document.querySelector('.offers-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'offers-modal';

  const panel = document.createElement('div');
  panel.className = 'offers-panel';

  const header = document.createElement('div');
  header.className = 'offers-header';
  header.innerHTML = '<h3>Select Offer</h3>';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'offers-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => overlay.remove());
  header.append(closeBtn);

  const table = document.createElement('table');
  table.className = 'offers-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th></th>
        <th>Name</th>
        <th>Type</th>
        <th>Modified</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  let selectedOffer = null;
  const currentName = (activity?.name || '').toLowerCase();

  offers.forEach((o) => {
    const tr = document.createElement('tr');
    tr.className = 'offer-row';
    const isMatch = o.name.toLowerCase() === currentName;
    if (isMatch) { tr.classList.add('selected'); selectedOffer = o; }
    tr.innerHTML = `
      <td class="select-cell"><span class="radio"></span></td>
      <td>${o.name}</td>
      <td>${o.type ?? '—'}</td>
      <td>${formatDate(o.modifiedAt)}</td>
    `;
    tr.addEventListener('click', () => {
      tbody.querySelectorAll('.offer-row.selected').forEach((r) => r.classList.remove('selected'));
      tr.classList.add('selected');
      selectedOffer = o;
    });
    tbody.append(tr);
  });

  table.append(tbody);

  const footer = document.createElement('div');
  footer.className = 'offers-footer';
  const applyBtn = document.createElement('button');
  applyBtn.className = 'btn-create';
  applyBtn.textContent = 'Apply';
  applyBtn.addEventListener('click', async () => {
    if (!selectedOffer) { overlay.remove(); return; }
    applyBtn.disabled = true;
    applyBtn.textContent = 'Saving…';

    const errEl = footer.querySelector('.offers-error') || (() => {
      const el = document.createElement('p');
      el.className = 'offers-error';
      footer.prepend(el);
      return el;
    })();
    errEl.textContent = '';

    try {
      const url = `${RUNTIME_URL}?resource=update-offer&id=${activity.id}&type=${activity.type}&offerId=${selectedOffer.id}`;
      const resp = await fetch(url);
      const result = await resp.json();

      if (result.httpStatus >= 400 || result.error || result.raw) {
        const msg = result.raw?.errors?.[0]?.message
          || result.errors?.[0]?.message
          || result.error
          || `API error ${result.httpStatus || ''}`;
        throw new Error(msg);
      }

      overlay.remove();
    } catch (err) {
      errEl.textContent = `Error: ${err.message}`;
      applyBtn.disabled = false;
      applyBtn.textContent = 'Apply';
    }
  });
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-change';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => overlay.remove());
  footer.append(cancelBtn, applyBtn);

  panel.append(header, table, footer);
  overlay.append(panel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
}

// ── Action bar ─────────────────────────────────────────────────────────────

const ACTIVITY_TYPES = [
  'A/B Test',
  'Automated Personalization',
  'Experience Targeting',
  'Multivariate Test',
  'Recommendations',
];

function renderActionBar(onActivityCreated) {
  const wrapper = document.createElement('div');
  wrapper.className = 'action-bar';

  const btn = document.createElement('button');
  btn.className = 'btn-create';
  btn.textContent = 'Create Activity';

  const flyout = document.createElement('ul');
  flyout.className = 'flyout hidden';

  ACTIVITY_TYPES.forEach((type) => {
    const li = document.createElement('li');
    li.textContent = type;
    li.addEventListener('click', () => {
      flyout.classList.add('hidden');
      if (type === 'Experience Targeting') {
        showCreateXtModal(onActivityCreated);
      } else {
        alert(`${type} creation via API coming soon`);
      }
    });
    flyout.append(li);
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!btn.disabled) flyout.classList.toggle('hidden');
  });

  document.addEventListener('click', () => flyout.classList.add('hidden'));

  const changeBtn = document.createElement('button');
  changeBtn.className = 'btn-change hidden';
  changeBtn.textContent = 'Change Experience';
  changeBtn.addEventListener('click', async () => {
    const activity = changeBtn._activity;
    changeBtn.disabled = true;
    changeBtn.textContent = 'Loading offers…';
    try {
      const offers = await fetchOffers();
      showOffersModal(offers, activity);
    } catch (err) {
      alert(`Failed to load offers: ${err.message}`);
    } finally {
      changeBtn.disabled = false;
      changeBtn.textContent = 'Change Experience';
    }
  });

  wrapper.append(btn, flyout, changeBtn);

  wrapper.setSelected = (hasSelection, activity = null) => {
    btn.disabled = hasSelection;
    btn.classList.toggle('disabled', hasSelection);
    flyout.classList.add('hidden');
    changeBtn.classList.toggle('hidden', !hasSelection);
    changeBtn._activity = activity;
  };

  return wrapper;
}

// ── Activities table ────────────────────────────────────────────────────────

function renderActivities(activities, onActivityCreated) {
  const container = document.createElement('div');
  container.className = 'activities';

  const headingRow = document.createElement('div');
  headingRow.className = 'heading-row';

  const heading = document.createElement('h2');
  heading.textContent = 'Target Activities';

  const expandBtn = document.createElement('a');
  expandBtn.className = 'btn-expand';
  expandBtn.href = window.location.href;
  expandBtn.target = '_blank';
  expandBtn.title = 'Open in new tab';
  expandBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
  </svg>`;

  headingRow.append(heading, expandBtn);
  container.append(headingRow);

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th></th>
        <th>ID</th>
        <th>Name</th>
        <th>Type</th>
        <th>State</th>
        <th>Modified</th>
      </tr>
    </thead>
  `;

  const actionBar = renderActionBar(onActivityCreated);
  let selectedRow = null;

  const tbody = document.createElement('tbody');
  activities.forEach((a) => {
    const tr = document.createElement('tr');
    tr.className = 'activity-row';
    tr.innerHTML = `
      <td class="select-cell"><span class="radio"></span></td>
      <td>${a.id}</td>
      <td>${a.name}</td>
      <td>${a.type.toUpperCase()}</td>
      <td><span class="state state--${a.state}">${a.state}</span></td>
      <td>${formatDate(a.modifiedAt)}</td>
    `;
    tr.addEventListener('click', () => {
      if (selectedRow === tr) {
        tr.classList.remove('selected');
        selectedRow = null;
        actionBar.setSelected(false);
      } else {
        if (selectedRow) selectedRow.classList.remove('selected');
        tr.classList.add('selected');
        selectedRow = tr;
        actionBar.setSelected(true, a);
      }
    });
    tbody.append(tr);
  });

  table.append(tbody);
  container.append(table, actionBar);
  return { container, tbody, actionBar };
}

// ── Init ────────────────────────────────────────────────────────────────────

(async function init() {
  const daContext = await Promise.race([
    DA_SDK,
    new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
  ]);
  if (daContext) {
    const { org, repo, path } = daContext.context;
    console.log(org, repo, path);
  }

  document.body.innerHTML = '<p class="loading">Loading Target activities…</p>';

  try {
    let activities = await fetchActivities();
    document.body.innerHTML = '';

    function onActivityCreated(newActivity) {
      // Prepend newly created activity to the list and re-render
      activities = [newActivity, ...activities];
      document.body.innerHTML = '';
      const { container } = renderActivities(activities, onActivityCreated);
      document.body.append(container);
    }

    const { container } = renderActivities(activities, onActivityCreated);
    document.body.append(container);
  } catch (err) {
    document.body.innerHTML = `<p class="error">${err.message}</p>`;
  }
}());
