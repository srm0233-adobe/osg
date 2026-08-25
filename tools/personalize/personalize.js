import DA_SDK from 'https://da.live/nx/utils/sdk.js';

// ── Starter scaffold ─────────────────────────────────────────────────────────
// A DA app skeleton, modeled on tools/target. It boots with the DA SDK, reads
// the authoring context, and has two views: an intro panel and an audiences
// list fetched from the shared personalization runtime.

const RUNTIME_URL = 'https://332794-868ceruleanwhale.adobeioruntime.net/api/v1/web/default/target-activities';
const AUDIENCE_LIBRARY_URL = 'https://experience.adobe.com/#/@acsmarketing/target/audiences/audienceLibrary';
// Default mbox for new activities; editable per-activity in the "Assign offers" step.
// The target-offer block requests the same mbox so it renders the personalized
// offer for the matching audience.
const DEFAULT_MBOX = 'xsc-demo-personalize';

// DA table markup for a `target-offer` block: name row, mbox row, default content.
function targetOfferBlockHtml(mboxName) {
  return `<table><tbody>`
    + `<tr><td>target-offer</td></tr>`
    + `<tr><td>${mboxName}</td></tr>`
    + `<tr><td>Default content — replaced by the Target offer for the matching audience.</td></tr>`
    + `</tbody></table>`;
}

// DA Metadata block that enables Target on the page and points the hero-mbox
// swap at the target-offer block. `target-at-js` is intentionally omitted —
// head.html already sets it site-wide, and a duplicate breaks the loader.
function targetMetadataBlockHtml(mboxName) {
  return `<table><tbody>`
    + `<tr><td>Metadata</td></tr>`
    + `<tr><td>target</td><td>on</td></tr>`
    + `<tr><td>target-mbox-hero</td><td>${mboxName}</td></tr>`
    + `<tr><td>target-mbox-hero-selector</td><td>.target-offer</td></tr>`
    + `</tbody></table>`;
}

async function fetchAudiences() {
  const resp = await fetch(`${RUNTIME_URL}?${new URLSearchParams({ resource: 'audiences' })}`);
  if (!resp.ok) throw new Error(`Runtime error: ${resp.status}`);
  const { audiences } = await resp.json();
  return audiences ?? [];
}

async function fetchOffers() {
  const resp = await fetch(`${RUNTIME_URL}?${new URLSearchParams({ resource: 'offers' })}`);
  if (!resp.ok) throw new Error(`Runtime error: ${resp.status}`);
  const { offers } = await resp.json();
  return offers ?? [];
}

// Create a Target XT activity with one experience per audience/offer pair.
async function createActivity({
  name, mbox, experiences,
}) {
  const resp = await fetch(`${RUNTIME_URL}?${new URLSearchParams({
    resource: 'create-activity', name, mbox, experiences: JSON.stringify(experiences),
  })}`);
  const result = await resp.json().catch(() => ({}));
  if (!resp.ok || result.error) {
    throw new Error(result.error || `Runtime error: ${resp.status}`);
  }
  return result;
}

// Create a simple audience that matches a URL/mbox query parameter == value.
async function createAudience({ name, param, value }) {
  const resp = await fetch(`${RUNTIME_URL}?${new URLSearchParams({
    resource: 'create-audience', name, param, value,
  })}`);
  const result = await resp.json().catch(() => ({}));
  if (!resp.ok || result.error) {
    throw new Error(result.error || `Runtime error: ${resp.status}`);
  }
  return result;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── View 1: intro panel ──────────────────────────────────────────────────────

function renderMain(daContext, goToAudiences) {
  const container = document.createElement('div');
  container.className = 'personalize';

  const headingRow = document.createElement('div');
  headingRow.className = 'heading-row';
  headingRow.innerHTML = '<h2>Personalize</h2>';
  container.append(headingRow);

  const panel = document.createElement('div');
  panel.className = 'panel';

  const intro = document.createElement('p');
  intro.className = 'intro';
  intro.textContent = 'Personalization app scaffold. Wire your logic in personalize.js.';
  panel.append(intro);

  // The DA SDK gives you the authoring context (org, repo, page path) and a
  // token/actions for talking to DA. Available here for whatever you build next.
  if (daContext?.context) {
    const { org, repo, path } = daContext.context;
    const ctx = document.createElement('dl');
    ctx.className = 'context';
    ctx.innerHTML = `
      <dt>Org</dt><dd>${org ?? '—'}</dd>
      <dt>Repo</dt><dd>${repo ?? '—'}</dd>
      <dt>Path</dt><dd>${path ?? '—'}</dd>
    `;
    panel.append(ctx);
  }

  const action = document.createElement('button');
  action.className = 'btn-primary';
  action.textContent = 'Get started';
  action.addEventListener('click', goToAudiences);
  panel.append(action);

  container.append(panel);
  return container;
}

// ── View 2: audiences list ───────────────────────────────────────────────────

function renderAudiencesShell(goBack) {
  const container = document.createElement('div');
  container.className = 'personalize';

  const headingRow = document.createElement('div');
  headingRow.className = 'heading-row';
  const back = document.createElement('button');
  back.className = 'btn-back';
  back.textContent = '← Back';
  back.addEventListener('click', goBack);
  headingRow.append(back);
  const h2 = document.createElement('h2');
  h2.textContent = 'Audiences';
  headingRow.append(h2);
  const openLink = document.createElement('a');
  openLink.className = 'open-in-target';
  openLink.href = AUDIENCE_LIBRARY_URL;
  openLink.target = '_blank';
  openLink.rel = 'noopener';
  openLink.textContent = 'Open in Target ↗';
  headingRow.append(openLink);
  container.append(headingRow);

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = '<p class="loading">Loading audiences…</p>';
  container.append(panel);

  return { container, panel };
}

function renderAudiencesTable(audiences, onSelectionChange = () => {}) {
  if (!audiences.length) {
    const empty = document.createElement('p');
    empty.className = 'intro';
    empty.textContent = 'No audiences found.';
    return empty;
  }

  const selected = new Set();
  const rowBoxes = [];
  const notify = () => onSelectionChange(audiences.filter((a) => selected.has(a.id)));

  const table = document.createElement('table');
  const selectAll = document.createElement('input');
  selectAll.type = 'checkbox';
  selectAll.className = 'row-check';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const selectTh = document.createElement('th');
  selectTh.className = 'select-cell';
  selectTh.append(selectAll);
  headRow.append(selectTh);
  ['Name', 'Origin', 'Modified'].forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.append(th);
  });
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement('tbody');
  audiences.forEach((a) => {
    const tr = document.createElement('tr');

    const checkCell = document.createElement('td');
    checkCell.className = 'select-cell';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'row-check';
    box.addEventListener('change', () => {
      if (box.checked) selected.add(a.id); else selected.delete(a.id);
      tr.classList.toggle('selected', box.checked);
      selectAll.checked = selected.size === audiences.length;
      selectAll.indeterminate = selected.size > 0 && selected.size < audiences.length;
      notify();
    });
    rowBoxes.push(box);
    checkCell.append(box);

    const name = document.createElement('td');
    name.textContent = a.name ?? '—';
    const origin = document.createElement('td');
    origin.textContent = a.origin ?? '—';
    const modified = document.createElement('td');
    modified.textContent = formatDate(a.modifiedAt);

    tr.append(checkCell, name, origin, modified);
    tbody.append(tr);
  });
  table.append(tbody);

  selectAll.addEventListener('change', () => {
    selected.clear();
    if (selectAll.checked) audiences.forEach((a) => selected.add(a.id));
    rowBoxes.forEach((box, i) => {
      box.checked = selectAll.checked;
      box.closest('tr').classList.toggle('selected', selectAll.checked);
    });
    selectAll.indeterminate = false;
    notify();
  });

  return table;
}

// ── Create-audience form ─────────────────────────────────────────────────────

function field(label, input) {
  const wrap = document.createElement('div');
  wrap.className = 'form-field';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  wrap.append(lbl, input);
  return wrap;
}

function renderCreateForm(onCreated) {
  const form = document.createElement('div');
  form.className = 'create-form';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'e.g. summer-campaign-visitors';

  const paramInput = document.createElement('input');
  paramInput.type = 'text';
  paramInput.placeholder = 'e.g. campaign';

  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.placeholder = 'e.g. summer';

  form.append(
    field('Audience name', nameInput),
    field('URL parameter', paramInput),
    field('Equals value', valueInput),
  );

  const status = document.createElement('p');
  status.className = 'form-status';

  const actions = document.createElement('div');
  actions.className = 'form-actions';
  const createBtn = document.createElement('button');
  createBtn.className = 'btn-primary';
  createBtn.textContent = 'Create audience';
  actions.append(createBtn);
  form.append(actions, status);

  createBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const param = paramInput.value.trim();
    const value = valueInput.value.trim();
    if (!name || !param || !value) {
      status.className = 'form-status error';
      status.textContent = 'All three fields are required.';
      return;
    }
    createBtn.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Creating…';
    try {
      await createAudience({ name, param, value });
      onCreated();
    } catch (err) {
      createBtn.disabled = false;
      status.className = 'form-status error';
      status.textContent = err.message;
    }
  });

  return form;
}

// ── Offer picker modal ───────────────────────────────────────────────────────

function renderOfferPicker(offers, onPick) {
  const overlay = document.createElement('div');
  overlay.className = 'picker-overlay';
  const panel = document.createElement('div');
  panel.className = 'picker-panel';

  const header = document.createElement('div');
  header.className = 'picker-header';
  header.innerHTML = '<h3>Select an offer</h3>';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'picker-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => overlay.remove());
  header.append(closeBtn);

  const filter = document.createElement('input');
  filter.type = 'text';
  filter.className = 'picker-filter';
  filter.placeholder = 'Filter offers…';

  const list = document.createElement('div');
  list.className = 'picker-list';

  const paint = (term = '') => {
    list.innerHTML = '';
    offers
      .filter((o) => (o.name ?? '').toLowerCase().includes(term.toLowerCase()))
      .forEach((o) => {
        const item = document.createElement('button');
        item.className = 'picker-item';
        item.textContent = o.name ?? `Offer ${o.id}`;
        item.addEventListener('click', () => { onPick(o); overlay.remove(); });
        list.append(item);
      });
    if (!list.firstChild) {
      list.innerHTML = '<p class="intro">No matching offers.</p>';
    }
  };
  filter.addEventListener('input', () => paint(filter.value));
  paint();

  panel.append(header, filter, list);
  overlay.append(panel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  return overlay;
}

// ── Matrix: selected audiences × chosen offer ────────────────────────────────

function renderMatrix(audiences, offers, assignments, onChange = () => {}) {
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr><th>Audience</th><th>Offer</th><th></th></tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');

  audiences.forEach((a) => {
    const tr = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = a.name ?? '—';

    const offerCell = document.createElement('td');
    offerCell.className = 'offer-cell';
    const chosen = assignments.get(a.id);
    offerCell.textContent = chosen ? chosen.name : '—';

    const actionCell = document.createElement('td');
    actionCell.className = 'action-cell';
    const selectBtn = document.createElement('button');
    selectBtn.className = 'btn-secondary';
    selectBtn.textContent = 'Select…';
    selectBtn.addEventListener('click', () => {
      document.body.append(renderOfferPicker(offers, (offer) => {
        assignments.set(a.id, offer);
        offerCell.textContent = offer.name;
        offerCell.classList.add('assigned');
        onChange();
      }));
    });
    actionCell.append(selectBtn);

    tr.append(nameCell, offerCell, actionCell);
    tbody.append(tr);
  });

  table.append(tbody);
  return table;
}

// ── Init / view switching ────────────────────────────────────────────────────

(async function init() {
  document.body.innerHTML = '<p class="loading">Loading Personalize…</p>';

  // DA_SDK resolves inside the DA authoring iframe. Race a short timeout so the
  // app still renders (without context) if opened outside DA.
  const daContext = await Promise.race([
    DA_SDK,
    new Promise((resolve) => { setTimeout(() => resolve(null), 1500); }),
  ]);

  function showMain() {
    document.body.innerHTML = '';
    document.body.append(renderMain(daContext, showAudiences));
  }

  async function showOfferMatrix(selectedAudiences) {
    document.body.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'personalize';
    const headingRow = document.createElement('div');
    headingRow.className = 'heading-row';
    const back = document.createElement('button');
    back.className = 'btn-back';
    back.textContent = '← Back';
    back.addEventListener('click', showAudiences);
    const h2 = document.createElement('h2');
    h2.textContent = 'Assign offers';
    headingRow.append(back, h2);
    container.append(headingRow);

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = '<p class="loading">Loading offers…</p>';
    container.append(panel);
    document.body.append(container);

    try {
      const offers = await fetchOffers();
      const assignments = new Map();
      panel.innerHTML = '';
      const intro = document.createElement('p');
      intro.className = 'intro';
      intro.textContent = 'Pick an offer for each selected audience, then create the activity.';

      // Footer: activity name + mbox + create button + status.
      const footer = document.createElement('div');
      footer.className = 'activity-footer';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'activity-name';
      nameInput.placeholder = 'Activity name';
      nameInput.value = `personalize-${new Date().toISOString().slice(0, 10)}`;
      const mboxInput = document.createElement('input');
      mboxInput.type = 'text';
      mboxInput.className = 'activity-name';
      mboxInput.placeholder = 'Mbox name';
      mboxInput.value = DEFAULT_MBOX;
      const createBtn = document.createElement('button');
      createBtn.className = 'btn-primary';
      createBtn.textContent = 'Create activity →';
      createBtn.disabled = true;
      const status = document.createElement('p');
      status.className = 'form-status';
      footer.append(nameInput, mboxInput, createBtn, status);

      // Enable create only once every selected audience has an offer.
      const allAssigned = () => selectedAudiences.every((a) => assignments.has(a.id));
      const refresh = () => { createBtn.disabled = !allAssigned(); };

      createBtn.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        const mbox = mboxInput.value.trim() || DEFAULT_MBOX;
        if (!name) {
          status.className = 'form-status error';
          status.textContent = 'Activity name is required.';
          return;
        }
        const experiences = selectedAudiences.map((a) => ({
          audienceId: a.id,
          offerId: assignments.get(a.id).id,
        }));
        createBtn.disabled = true;
        status.className = 'form-status';
        status.textContent = 'Creating activity…';
        try {
          const activity = await createActivity({ name, mbox, experiences });
          showActivityCreated(activity, selectedAudiences, assignments, mbox);
        } catch (err) {
          createBtn.disabled = false;
          status.className = 'form-status error';
          status.textContent = err.message;
        }
      });

      panel.append(
        intro,
        renderMatrix(selectedAudiences, offers, assignments, refresh),
        footer,
      );
    } catch (err) {
      panel.innerHTML = `<p class="error">${err.message}</p>`;
    }
  }

  function showActivityCreated(activity, audiences, assignments, mbox) {
    document.body.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'personalize';

    const headingRow = document.createElement('div');
    headingRow.className = 'heading-row';
    headingRow.innerHTML = '<h2>Activity created</h2>';
    container.append(headingRow);

    const panel = document.createElement('div');
    panel.className = 'panel';

    const ok = document.createElement('p');
    ok.className = 'success';
    ok.textContent = `✓ "${activity.name}" created (id ${activity.id}).`;
    panel.append(ok);

    const summary = document.createElement('table');
    summary.innerHTML = '<thead><tr><th>Audience</th><th>Offer</th></tr></thead>';
    const tbody = document.createElement('tbody');
    audiences.forEach((a) => {
      const tr = document.createElement('tr');
      const n = document.createElement('td');
      n.textContent = a.name;
      const o = document.createElement('td');
      o.textContent = assignments.get(a.id)?.name ?? '—';
      tr.append(n, o);
      tbody.append(tr);
    });
    summary.append(tbody);
    panel.append(summary);

    const status = document.createElement('p');
    status.className = 'form-status';

    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-primary';
    addBtn.textContent = 'Add to DA';
    addBtn.addEventListener('click', () => {
      // actions.sendHTML inserts into the currently-open DA document. Only
      // available when this app runs inside the DA authoring iframe.
      if (!daContext?.actions?.sendHTML) {
        status.className = 'form-status error';
        status.textContent = 'Open this app inside DA to add the block to a page.';
        return;
      }
      daContext.actions.sendHTML(
        targetMetadataBlockHtml(mbox) + targetOfferBlockHtml(mbox),
      );
      status.className = 'form-status';
      status.textContent = `Added a target-offer block + Target metadata (mbox "${mbox}") to the page.`;
    });

    const openLink = document.createElement('a');
    openLink.className = 'open-in-target';
    openLink.href = 'https://experience.adobe.com/#/@acsmarketing/target/activities';
    openLink.target = '_blank';
    openLink.rel = 'noopener';
    openLink.textContent = 'Open in Target ↗';
    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn-secondary';
    doneBtn.textContent = 'Done';
    doneBtn.addEventListener('click', showMain);
    actions.append(addBtn, doneBtn, openLink);
    panel.append(actions, status);

    container.append(panel);
    document.body.append(container);
  }

  async function showAudiences() {
    document.body.innerHTML = '';
    const { container, panel } = renderAudiencesShell(showMain);
    document.body.append(container);
    try {
      const audiences = await fetchAudiences();
      panel.innerHTML = '';

      const toolbar = document.createElement('div');
      toolbar.className = 'toolbar';
      const newBtn = document.createElement('button');
      newBtn.className = 'btn-secondary';
      newBtn.textContent = '+ New audience';
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn-primary';
      nextBtn.textContent = 'Next →';
      nextBtn.disabled = true;
      toolbar.append(newBtn, nextBtn);

      const formSlot = document.createElement('div');
      newBtn.addEventListener('click', () => {
        if (newBtn.disabled) return;
        if (formSlot.firstChild) {
          formSlot.innerHTML = '';
          return;
        }
        // Re-fetch the list after a successful create so the new audience shows.
        formSlot.append(renderCreateForm(showAudiences));
      });

      let chosenAudiences = [];
      nextBtn.addEventListener('click', () => {
        if (chosenAudiences.length) showOfferMatrix(chosenAudiences);
      });

      const selectionBar = document.createElement('p');
      selectionBar.className = 'selection-bar';
      const updateSelection = (chosen) => {
        chosenAudiences = chosen;
        const hasSelection = chosen.length > 0;
        // Disable "New audience" while audiences are selected; enable "Next".
        newBtn.disabled = hasSelection;
        nextBtn.disabled = !hasSelection;
        if (hasSelection) formSlot.innerHTML = '';
        selectionBar.textContent = hasSelection
          ? `${chosen.length} selected: ${chosen.map((a) => a.name).join(', ')}`
          : 'No audiences selected.';
      };
      updateSelection([]);

      panel.append(toolbar, formSlot, renderAudiencesTable(audiences, updateSelection), selectionBar);
    } catch (err) {
      panel.innerHTML = `<p class="error">${err.message}</p>`;
    }
  }

  showMain();
}());
