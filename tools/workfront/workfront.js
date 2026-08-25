import DA_SDK from 'https://da.live/nx/utils/sdk.js';

const RUNTIME_URL = 'https://3635370-144scarletlobster.adobeioruntime.net/api/v1/web/default/workfront-planning';
const RUNTIME_ORIGIN = new URL(RUNTIME_URL).origin;
const WF_DOMAIN = 'aemshowcase2.my.workfront.com';
const WF_CLIENT_ID = '56e219a0a1eeae8feb55c444e3d8a8b6';

// ── OAuth helpers ─────────────────────────────────────────────────────────────
// Redirect URI is the Runtime action itself — a fixed, domain-independent
// URL registered once with Workfront. The action exchanges the code and
// postMessages the tokens back to this page's origin (passed via `state`).

function storedToken() {
  const token = localStorage.getItem('wf_access_token');
  const expiry = Number(localStorage.getItem('wf_token_expiry') || 0);
  if (token && expiry && Date.now() > expiry) {
    localStorage.removeItem('wf_access_token');
    return null;
  }
  return token || null;
}
function storedRefresh() { return localStorage.getItem('wf_refresh_token'); }
function saveTokens({ access_token, refresh_token, expires_in }) {
  if (access_token) {
    localStorage.setItem('wf_access_token', access_token);
    const ttl = (Number(expires_in) || 36000) * 1000;
    localStorage.setItem('wf_token_expiry', String(Date.now() + ttl));
  }
  if (refresh_token) localStorage.setItem('wf_refresh_token', refresh_token);
}

async function runtimeCall(params) {
  const resp = await fetch(`${RUNTIME_URL}?${new URLSearchParams(params)}`);
  if (!resp.ok) throw new Error(`Runtime ${resp.status}`);
  return resp.json();
}

function buildAuthUrl() {
  return `https://${WF_DOMAIN}/integrations/oauth2/authorize?`
    + `client_id=${WF_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(RUNTIME_URL)}`
    + `&state=${encodeURIComponent(location.origin)}`;
}

async function ensureToken() {
  let token = storedToken();
  if (token) return token;

  const refresh = storedRefresh();
  if (refresh) {
    const json = await runtimeCall({ resource: 'refresh_token', refresh_token: refresh }).catch(() => ({}));
    if (json.access_token) { saveTokens(json); return json.access_token; }
    localStorage.removeItem('wf_access_token');
    localStorage.removeItem('wf_refresh_token');
  }

  return null; // caller handles missing token by showing connect screen
}

function showConnectScreen() {
  document.body.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;font-family:sans-serif';
  const title = document.createElement('p');
  title.style.cssText = 'font-size:15px;color:#444;margin:0';
  title.textContent = 'Connect to Workfront to continue.';
  const btn = document.createElement('button');
  btn.style.cssText = 'padding:10px 24px;background:#1473e6;color:#fff;border:none;border-radius:4px;font-size:14px;cursor:pointer';
  btn.textContent = 'Connect to Workfront';
  btn.addEventListener('click', async () => {
    // Request first-party storage access (user gesture required)
    if (document.requestStorageAccess) {
      try { await document.requestStorageAccess(); } catch {}
    }
    window.open(buildAuthUrl(), '_blank', 'width=620,height=720');
    btn.textContent = 'Authorize in the new tab, then return here…';
    btn.style.background = '#888';

    // The popup navigates to Workfront, then to the Runtime relay, which
    // postMessages the tokens back here and closes itself.
    const onMessage = (e) => {
      if (e.origin === RUNTIME_ORIGIN && e.data?.type === 'wf_tokens') {
        window.removeEventListener('message', onMessage);
        saveTokens(e.data);
        location.reload();
      }
    };
    window.addEventListener('message', onMessage);
  });
  wrap.append(title, btn);
  document.body.append(wrap);
}

// ── Runtime fetch ─────────────────────────────────────────────────────────────

async function api(params) {
  const token = await ensureToken();
  if (!token) return null;
  const url = `${RUNTIME_URL}?${new URLSearchParams({ ...params, wf_token: token })}`;
  const resp = await fetch(url);
  const json = await resp.json();
  if (json.error) throw new Error(json.error);
  if (!resp.ok) throw new Error(`Runtime error ${resp.status}`);
  return json.data ?? json;
}

// ── Status helpers ────────────────────────────────────────────────────────────

const PROJECT_STATUS = {
  CUR: { label: 'Current',   color: '#2d9d78' },
  PLN: { label: 'Planning',  color: '#1473e6' },
  CPL: { label: 'Complete',  color: '#888' },
  DED: { label: 'Dead',      color: '#c00' },
  ONH: { label: 'On Hold',   color: '#e68619' },
};

const APPROVAL_STATUS = {
  AA:  { label: 'Approved',  color: '#2d9d78' },
  RJ:  { label: 'Rejected',  color: '#d7373f' },
  AD:  { label: 'Pending',   color: '#e68619' },
  AU:  { label: 'Recalled',  color: '#888' },
};

function badge(text, color) {
  const el = document.createElement('span');
  el.className = 'badge';
  el.style.cssText = `background:${color}22;color:${color};border:1px solid ${color}44`;
  el.textContent = text;
  return el;
}

function formatDate(iso) {
  if (!iso) return '—';
  // Workfront returns "2024-03-15T00:00:00:000+0000" — colon before ms instead of dot
  const normalized = iso.replace(/T(\d{2}:\d{2}:\d{2}):(\d{3})/, 'T$1.$2');
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function spinner() {
  const el = document.createElement('div');
  el.className = 'spinner-wrap';
  el.innerHTML = '<div class="spinner"></div>';
  return el;
}

function emptyState(msg) {
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg><p>${msg}</p>`;
  return el;
}

// ── App ───────────────────────────────────────────────────────────────────────

async function buildApp() {
  const shell = document.createElement('div');
  shell.className = 'app-shell';

  // ── Top bar
  const topbar = document.createElement('div');
  topbar.className = 'topbar';
  topbar.innerHTML = `
    <span class="topbar-title">Workfront Library</span>
    <div class="topbar-sep"></div>
    <span class="workspace-label">Projects</span>
    <a class="topbar-expand" href="https://${WF_DOMAIN}" target="_blank" rel="noopener" title="Open Workfront">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
      </svg>
    </a>`;

  // ── Sidebar (projects)
  const sidebar = document.createElement('nav');
  sidebar.className = 'sidebar';
  const sidebarHeading = document.createElement('div');
  sidebarHeading.className = 'sidebar-heading';
  sidebarHeading.textContent = 'Projects';
  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';
  filterBar.innerHTML = `
    <button class="filter-btn" data-filter="member">I'm On</button>
    <button class="filter-btn" data-filter="owner">I Own</button>`;
  const sidebarList = document.createElement('div');
  sidebar.append(sidebarHeading, filterBar, sidebarList);

  // ── Main (documents + approvals)
  const main = document.createElement('div');
  main.className = 'main';

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  const toolbarTitle = document.createElement('span');
  toolbarTitle.className = 'toolbar-title';
  toolbarTitle.textContent = '—';
  const toolbarCount = document.createElement('span');
  toolbarCount.className = 'toolbar-count';

  const tabBar = document.createElement('div');
  tabBar.className = 'tab-bar';
  tabBar.innerHTML = `
    <button class="tab-btn active" data-tab="tasks">Tasks</button>
    <button class="tab-btn" data-tab="issues">Issues</button>
    <button class="tab-btn" data-tab="documents">Documents</button>`;

  const searchWrap = document.createElement('div');
  searchWrap.className = 'search-wrap';
  searchWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
  </svg>`;
  const searchInput = document.createElement('input');
  searchInput.className = 'search-input';
  searchInput.placeholder = 'Search…';
  searchWrap.append(searchInput);

  const newTaskBtn = document.createElement('button');
  newTaskBtn.className = 'btn-new-task';
  newTaskBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
    <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
  </svg> New Task`;
  newTaskBtn.style.display = 'none';

  const newIssueBtn = document.createElement('button');
  newIssueBtn.className = 'btn-new-task';
  newIssueBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
    <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
  </svg> New Issue`;
  newIssueBtn.style.cssText = 'display:none;background:#e68619';
  newIssueBtn.addEventListener('mouseenter', () => { newIssueBtn.style.background = '#cb6f15'; });
  newIssueBtn.addEventListener('mouseleave', () => { newIssueBtn.style.background = '#e68619'; });

  toolbar.append(toolbarTitle, toolbarCount, tabBar, searchWrap, newTaskBtn, newIssueBtn);
  const recordsArea = document.createElement('div');
  recordsArea.className = 'records-area';
  recordsArea.append(emptyState('Select a project from the sidebar.'));
  main.append(toolbar, recordsArea);

  shell.append(topbar, sidebar, main);
  document.body.append(shell);

  // ── Detail panel
  const detailPanel = buildDetailPanel();

  // ── Issue edit panel
  const issuePanel = buildIssuePanel(api);

  // ── New Task modal
  let cachedCurrentUser = null;
  newTaskBtn.addEventListener('click', () => openNewTaskModal());

  async function openNewTaskModal() {
    if (!currentProject) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-header">
        <div class="modal-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
        </div>
        <span class="modal-title">New Task</span>
      </div>
      <div class="modal-body">
        <div class="modal-field">
          <label class="modal-label">Task Name <span style="color:#d7373f">*</span></label>
          <input class="modal-input" id="nt-name" placeholder="Task Name" autocomplete="off">
        </div>
        <div class="modal-field">
          <label class="modal-label">Description</label>
          <textarea class="modal-textarea" id="nt-desc" placeholder="Description" maxlength="4000"></textarea>
          <div class="modal-charcount"><span id="nt-desc-count">0</span>/4000</div>
        </div>
        <div class="modal-field">
          <label class="modal-label">Assignments</label>
          <div class="modal-assign-row">
            <div id="nt-assignee-chip" class="modal-assignee-chip" style="display:none"></div>
            <button class="modal-assign-me" id="nt-assign-me">Assign to me</button>
          </div>
        </div>
        <div class="modal-field modal-row">
          <div style="flex:1">
            <label class="modal-label">Duration</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input class="modal-input" id="nt-duration" type="number" min="1" value="1" style="width:80px">
              <span style="font-size:13px;color:#555">Days</span>
            </div>
          </div>
          <div style="flex:1">
            <label class="modal-label">Planned Completion Date</label>
            <input class="modal-input" id="nt-date" type="date">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn-primary" id="nt-submit">Create task</button>
        <button class="modal-btn-cancel" id="nt-cancel">Cancel</button>
      </div>`;

    overlay.append(modal);
    document.body.append(overlay);

    const nameInput = modal.querySelector('#nt-name');
    const descInput = modal.querySelector('#nt-desc');
    const descCount = modal.querySelector('#nt-desc-count');
    const assignMeBtn = modal.querySelector('#nt-assign-me');
    const assigneeChip = modal.querySelector('#nt-assignee-chip');
    const submitBtn = modal.querySelector('#nt-submit');
    const cancelBtn = modal.querySelector('#nt-cancel');

    nameInput.focus();

    descInput.addEventListener('input', () => { descCount.textContent = descInput.value.length; });

    let assignedToID = null;
    assignMeBtn.addEventListener('click', async () => {
      assignMeBtn.textContent = 'Loading…';
      assignMeBtn.disabled = true;
      try {
        if (!cachedCurrentUser) {
          const result = await api({ resource: 'current_user' });
          cachedCurrentUser = Array.isArray(result) ? result[0] : result;
        }
        if (cachedCurrentUser?.ID) {
          assignedToID = cachedCurrentUser.ID;
          assigneeChip.textContent = cachedCurrentUser.name || cachedCurrentUser.emailAddr || 'Me';
          assigneeChip.style.display = '';
          assignMeBtn.style.display = 'none';
        }
      } catch {
        assignMeBtn.textContent = 'Assign to me';
        assignMeBtn.disabled = false;
      }
    });

    const close = () => overlay.remove();
    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });

    submitBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) { nameInput.classList.add('modal-input--error'); nameInput.focus(); return; }
      nameInput.classList.remove('modal-input--error');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating…';

      const params = { resource: 'create_task', name, projectId: currentProject.ID };
      if (descInput.value.trim()) params.description = descInput.value.trim();
      const dur = modal.querySelector('#nt-duration').value;
      if (dur && Number(dur) > 0) params.duration = dur;
      const date = modal.querySelector('#nt-date').value;
      if (date) params.plannedCompletionDate = date;
      if (assignedToID) params.assignedToID = assignedToID;

      try {
        await api(params);
        close();
        await loadTasks(currentProject);
      } catch (e) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create task';
        const err = modal.querySelector('.modal-error') || document.createElement('p');
        err.className = 'modal-error';
        err.textContent = e.message;
        modal.querySelector('.modal-footer').prepend(err);
      }
    });
  }

  newIssueBtn.addEventListener('click', () => openNewIssueModal());

  async function openNewIssueModal() {
    if (!currentProject) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-header">
        <div class="modal-icon" style="background:#e68619">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/>
          </svg>
        </div>
        <span class="modal-title">New Issue</span>
      </div>
      <div class="modal-body">
        <div class="modal-field">
          <label class="modal-label">Issue Name <span style="color:#d7373f">*</span></label>
          <input class="modal-input" id="ni-name" placeholder="Issue Name" autocomplete="off">
        </div>
        <div class="modal-field">
          <label class="modal-label">Description</label>
          <textarea class="modal-textarea" id="ni-desc" placeholder="Description" maxlength="4000"></textarea>
          <div class="modal-charcount"><span id="ni-desc-count">0</span>/4000</div>
        </div>
        <div class="modal-field modal-row">
          <div style="flex:1">
            <label class="modal-label">Priority</label>
            <select class="modal-input" id="ni-priority" style="width:100%">
              <option value="3">Normal</option>
              <option value="1">Urgent</option>
              <option value="2">High</option>
              <option value="4">Low</option>
              <option value="0">None</option>
            </select>
          </div>
          <div style="flex:1">
            <label class="modal-label">Planned Completion Date</label>
            <input class="modal-input" id="ni-date" type="date">
          </div>
        </div>
        <div class="modal-field">
          <label class="modal-label">Assignments</label>
          <div class="modal-assign-row">
            <div id="ni-assignee-chip" class="modal-assignee-chip" style="display:none"></div>
            <button class="modal-assign-me" id="ni-assign-me">Assign to me</button>
          </div>
          <input class="modal-input" id="ni-user-search" placeholder="Search people…" style="margin-top:6px;display:none">
          <div id="ni-user-results" class="user-results"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn-primary" id="ni-submit">Create issue</button>
        <button class="modal-btn-cancel" id="ni-cancel">Cancel</button>
      </div>`;

    overlay.append(modal);
    document.body.append(overlay);

    const nameInput = modal.querySelector('#ni-name');
    const descInput = modal.querySelector('#ni-desc');
    const descCount = modal.querySelector('#ni-desc-count');
    const assignMeBtn = modal.querySelector('#ni-assign-me');
    const assigneeChip = modal.querySelector('#ni-assignee-chip');
    const userSearchInput = modal.querySelector('#ni-user-search');
    const userResults = modal.querySelector('#ni-user-results');
    const submitBtn = modal.querySelector('#ni-submit');
    const cancelBtn = modal.querySelector('#ni-cancel');

    nameInput.focus();
    descInput.addEventListener('input', () => { descCount.textContent = descInput.value.length; });

    let assignedToID = null;

    assignMeBtn.addEventListener('click', async () => {
      assignMeBtn.textContent = 'Loading…';
      assignMeBtn.disabled = true;
      try {
        if (!cachedCurrentUser) {
          const result = await api({ resource: 'current_user' });
          cachedCurrentUser = Array.isArray(result) ? result[0] : result;
        }
        if (cachedCurrentUser?.ID) {
          assignedToID = cachedCurrentUser.ID;
          assigneeChip.textContent = cachedCurrentUser.name || cachedCurrentUser.emailAddr || 'Me';
          assigneeChip.style.display = '';
          assignMeBtn.style.display = 'none';
          userSearchInput.style.display = 'none';
        }
      } catch {
        assignMeBtn.textContent = 'Assign to me';
        assignMeBtn.disabled = false;
      }
    });

    // Show search input after clicking the chip area (if not already assigned)
    assigneeChip.addEventListener('click', () => {
      assignedToID = null;
      assigneeChip.style.display = 'none';
      assignMeBtn.style.display = '';
      assignMeBtn.disabled = false;
      assignMeBtn.textContent = 'Assign to me';
      userSearchInput.style.display = '';
      userSearchInput.focus();
    });

    userSearchInput.style.display = '';
    let searchTimer;
    userSearchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = userSearchInput.value.trim();
      userResults.innerHTML = '';
      if (!q) return;
      searchTimer = setTimeout(async () => {
        userResults.innerHTML = '<div style="padding:6px 10px;font-size:12px;color:#888">Searching…</div>';
        try {
          const users = await api({ resource: 'search_users', query: q });
          userResults.innerHTML = '';
          (Array.isArray(users) ? users : []).forEach((u) => {
            const item = document.createElement('div');
            item.className = 'user-result-item';
            item.innerHTML = `<strong style="font-size:13px">${esc(u.name)}</strong> <span style="font-size:11px;color:#888">${esc(u.emailAddr || '')}</span>`;
            item.addEventListener('click', () => {
              assignedToID = u.ID;
              assigneeChip.textContent = u.name;
              assigneeChip.style.display = '';
              assignMeBtn.style.display = 'none';
              userSearchInput.value = '';
              userSearchInput.style.display = 'none';
              userResults.innerHTML = '';
            });
            userResults.append(item);
          });
          if (!userResults.children.length) userResults.innerHTML = '<div style="padding:6px 10px;font-size:12px;color:#888">No results</div>';
        } catch {
          userResults.innerHTML = '<div style="padding:6px 10px;font-size:12px;color:#c00">Search failed</div>';
        }
      }, 300);
    });

    const close = () => overlay.remove();
    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });

    submitBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) { nameInput.classList.add('modal-input--error'); nameInput.focus(); return; }
      nameInput.classList.remove('modal-input--error');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating…';

      const p = { resource: 'create_issue', name, projectId: currentProject.ID };
      if (descInput.value.trim()) p.description = descInput.value.trim();
      const priority = modal.querySelector('#ni-priority').value;
      if (priority !== '') p.priority = priority;
      const date = modal.querySelector('#ni-date').value;
      if (date) p.plannedCompletionDate = date;
      if (assignedToID) p.assignedToID = assignedToID;

      try {
        await api(p);
        close();
        await loadIssues(currentProject);
      } catch (e) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create issue';
        const err = modal.querySelector('.modal-error') || document.createElement('p');
        err.className = 'modal-error';
        err.textContent = e.message;
        modal.querySelector('.modal-footer').prepend(err);
      }
    });
  }

  // ── State
  let allDocs = [];
  let allTasks = [];
  let allIssues = [];
  let currentProjectId = null;
  let currentProject = null;
  let activeFilter = 'member';
  let activeTab = 'tasks';

  searchInput.addEventListener('input', () => {
    if (activeTab === 'tasks') renderTasks(allTasks, searchInput.value);
    else if (activeTab === 'issues') renderIssues(allIssues, searchInput.value);
    else renderDocs(allDocs, searchInput.value);
  });

  tabBar.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === activeTab) return;
      activeTab = btn.dataset.tab;
      tabBar.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === activeTab));
      searchInput.value = '';
      if (!currentProject) return;
      if (activeTab === 'tasks') {
        newTaskBtn.style.display = '';
        newIssueBtn.style.display = 'none';
        toolbarCount.textContent = `(${allTasks.length})`;
        renderTasks(allTasks, '');
        if (!allTasks.length && currentProject) loadTasks(currentProject);
      } else if (activeTab === 'issues') {
        newTaskBtn.style.display = 'none';
        newIssueBtn.style.display = '';
        toolbarCount.textContent = `(${allIssues.length})`;
        renderIssues(allIssues, '');
        if (!allIssues.length && currentProject) loadIssues(currentProject);
      } else {
        newTaskBtn.style.display = 'none';
        newIssueBtn.style.display = 'none';
        toolbarCount.textContent = `(${allDocs.length})`;
        renderDocs(allDocs, '');
        if (!allDocs.length && currentProject) loadDocuments(currentProject);
      }
    });
  });

  // ── Filter button wiring
  filterBar.querySelectorAll('.filter-btn').forEach((btn) => {
    if (btn.dataset.filter === activeFilter) btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (btn.dataset.filter === activeFilter) return;
      activeFilter = btn.dataset.filter;
      filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('active', b.dataset.filter === activeFilter));
      loadProjects();
    });
  });

  // ── Load / reload projects
  async function loadProjects() {
    sidebarList.innerHTML = '';
    sidebarList.append(spinner());
    let projects = [];
    try {
      const apiParams = { resource: 'projects', limit: 200 };
      if (activeFilter === 'owner') apiParams.filter = 'owner';
      projects = await api(apiParams);
      if (!Array.isArray(projects)) projects = [];
    } catch (e) {
      sidebarList.innerHTML = `<p class="loading error">${esc(e.message)}</p>`;
      return;
    }

    sidebarList.innerHTML = '';
    if (!projects.length) {
      sidebarList.append(emptyState('No projects found.'));
      return;
    }

    projects.forEach((p) => {
      const st = PROJECT_STATUS[p.status] || { label: p.status, color: '#888' };
      const item = document.createElement('div');
      item.className = 'rt-item';
      item.id = `proj-${p.ID}`;
      item.innerHTML = `
        <div class="rt-icon" style="background:${st.color}">${esc((p.name || '?').charAt(0).toUpperCase())}</div>
        <div style="overflow:hidden">
          <div class="rt-name">${esc(p.name)}</div>
        </div>`;
      item.addEventListener('click', () => selectProject(p));
      sidebarList.append(item);
    });

    if (projects.length) selectProject(projects[0]);
  }

  await loadProjects();

  // ── Select project → always reset to Tasks tab
  async function selectProject(p) {
    currentProjectId = p.ID;
    currentProject = p;
    allDocs = [];
    allTasks = [];
    allIssues = [];
    searchInput.value = '';
    detailPanel.classList.remove('open');

    newTaskBtn.style.display = activeTab === 'tasks' ? '' : 'none';
    newIssueBtn.style.display = activeTab === 'issues' ? '' : 'none';

    document.querySelectorAll('.rt-item').forEach((el) =>
      el.classList.toggle('active', el.id === `proj-${p.ID}`));

    toolbarTitle.textContent = p.name;
    toolbarCount.textContent = '';
    recordsArea.innerHTML = '';

    if (activeTab === 'issues') await loadIssues(p);
    else if (activeTab === 'documents') await loadDocuments(p);
    else await loadTasks(p);
  }

  async function loadDocuments(p) {
    recordsArea.innerHTML = '';
    recordsArea.append(spinner());
    try {
      const docs = await api({ resource: 'documents', projectId: p.ID, limit: 200 });
      allDocs = Array.isArray(docs) ? docs : [];
      toolbarCount.textContent = `(${allDocs.length})`;
      renderDocs(allDocs, '');
    } catch (e) {
      recordsArea.innerHTML = `<p class="loading error">Error: ${esc(e.message)}</p>`;
    }
  }

  async function loadTasks(p) {
    recordsArea.innerHTML = '';
    recordsArea.append(spinner());
    try {
      const tasks = await api({ resource: 'tasks', projectId: p.ID, limit: 200 });
      allTasks = Array.isArray(tasks)
        ? [...tasks].sort((a, b) => Number(a.taskNumber) - Number(b.taskNumber))
        : [];
      toolbarCount.textContent = `(${allTasks.length})`;
      renderTasks(allTasks, '');
    } catch (e) {
      recordsArea.innerHTML = `<p class="loading error">Error: ${esc(e.message)}</p>`;
    }
  }

  async function loadIssues(p) {
    recordsArea.innerHTML = '';
    recordsArea.append(spinner());
    try {
      const issues = await api({ resource: 'issues', projectId: p.ID, limit: 200 });
      allIssues = Array.isArray(issues) ? issues : [];
      toolbarCount.textContent = `(${allIssues.length})`;
      renderIssues(allIssues, '');
    } catch (e) {
      recordsArea.innerHTML = `<p class="loading error">Error: ${esc(e.message)}</p>`;
    }
  }

  // ── Render documents table
  function renderDocs(docs, q) {
    const filtered = q
      ? docs.filter((d) => (d.name || '').toLowerCase().includes(q.toLowerCase()))
      : docs;

    recordsArea.innerHTML = '';
    if (!filtered.length) {
      recordsArea.append(emptyState(q ? 'No documents match.' : 'No documents in this project.'));
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'records-table-wrap';

    const table = document.createElement('table');
    table.className = 'records-table';
    table.innerHTML = `<thead><tr>
      <th>Name</th>
      <th>Owner</th>
      <th>Modified</th>
      <th>Approval</th>
      <th></th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    filtered.forEach((doc) => {
      const tr = document.createElement('tr');
      const hasApproval = doc.approvalProcesses && doc.approvalProcesses.length > 0;
      tr.innerHTML = `
        <td class="name-cell">${esc(doc.name || '(Untitled)')}</td>
        <td>${esc(doc.owner?.name || '—')}</td>
        <td>${esc(formatDate(doc.lastModDate))}</td>
        <td>${hasApproval ? '<span class="badge badge--blue">Has approval</span>' : '<span style="color:#aaa">—</span>'}</td>
        <td class="action-cell"></td>`;

      if (doc.currentVersionID) {
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn-view';
        viewBtn.textContent = 'Details';
        viewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openDetail(doc);
        });
        tr.querySelector('.action-cell').append(viewBtn);
      }

      tr.addEventListener('click', () => openDetail(doc));
      tbody.append(tr);
    });

    table.append(tbody);
    wrap.append(table);
    recordsArea.append(wrap);
  }

  // ── Render tasks table
  const TASK_STATUS = {
    NEW:  { label: 'New',         color: '#1473e6' },
    INP:  { label: 'In Progress', color: '#e68619' },
    CPL:  { label: 'Complete',    color: '#2d9d78' },
    ON_HOLD: { label: 'On Hold',  color: '#888' },
  };

  function renderTasks(tasks, q) {
    const filtered = q
      ? tasks.filter((t) => (t.name || '').toLowerCase().includes(q.toLowerCase()))
      : tasks;

    recordsArea.innerHTML = '';
    if (!filtered.length) {
      recordsArea.append(emptyState(q ? 'No tasks match.' : 'No tasks in this project.'));
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'records-table-wrap';

    const table = document.createElement('table');
    table.className = 'records-table';
    table.innerHTML = `<thead><tr>
      <th style="width:52px">#</th>
      <th>Task Name</th>
      <th>Assigned To</th>
      <th>Due Date</th>
      <th>% Done</th>
      <th>Status</th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    filtered.forEach((task) => {
      const st = TASK_STATUS[task.status] || { label: task.status || '—', color: '#888' };
      const pct = task.percentComplete != null ? `${task.percentComplete}%` : '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:#888;font-size:12px;font-weight:600">${esc(task.taskNumber || '—')}</td>
        <td class="name-cell">${esc(task.name || '(Untitled)')}</td>
        <td>${esc(task.assignedTo?.name || '—')}</td>
        <td>${esc(formatDate(task.plannedCompletionDate))}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:4px;background:#eee;border-radius:2px;min-width:40px">
              <div style="width:${task.percentComplete || 0}%;height:100%;background:${st.color};border-radius:2px"></div>
            </div>
            <span style="font-size:11px;color:#666;white-space:nowrap">${pct}</span>
          </div>
        </td>
        <td><span class="badge" style="background:${st.color}22;color:${st.color};border:1px solid ${st.color}44">${esc(st.label)}</span></td>`;
      tbody.append(tr);
    });

    table.append(tbody);
    wrap.append(table);
    recordsArea.append(wrap);
  }

  // ── Render issues table
  const ISSUE_STATUS = {
    NEW:  { label: 'New',         color: '#1473e6' },
    INP:  { label: 'In Progress', color: '#e68619' },
    CPL:  { label: 'Complete',    color: '#2d9d78' },
    RES:  { label: 'Resolved',    color: '#2d9d78' },
    ONH:  { label: 'On Hold',     color: '#888' },
    CLO:  { label: 'Closed',      color: '#888' },
    WFM:  { label: 'Won\'t Fix',  color: '#c00' },
  };
  const ISSUE_PRIORITY = { 0: '—', 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low' };
  const PRIORITY_COLOR = { 1: '#d7373f', 2: '#e68619', 3: '#1473e6', 4: '#888' };

  function renderIssues(issues, q) {
    const filtered = q
      ? issues.filter((i) => (i.name || '').toLowerCase().includes(q.toLowerCase()))
      : issues;

    recordsArea.innerHTML = '';
    if (!filtered.length) {
      recordsArea.append(emptyState(q ? 'No issues match.' : 'No issues in this project.'));
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'records-table-wrap';

    const table = document.createElement('table');
    table.className = 'records-table';
    table.innerHTML = `<thead><tr>
      <th>Issue Name</th>
      <th>Priority</th>
      <th>Assigned To</th>
      <th>Due Date</th>
      <th>Entered By</th>
      <th>Status</th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    filtered.forEach((issue) => {
      const st = ISSUE_STATUS[issue.status] || { label: issue.status || '—', color: '#888' };
      const pri = ISSUE_PRIORITY[issue.priority] || '—';
      const priColor = PRIORITY_COLOR[issue.priority] || '#888';
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td class="name-cell">${esc(issue.name || '(Untitled)')}</td>
        <td><span style="font-size:12px;font-weight:600;color:${priColor}">${esc(pri)}</span></td>
        <td>${esc(issue.assignedTo?.name || '—')}</td>
        <td>${esc(formatDate(issue.plannedCompletionDate))}</td>
        <td>${esc(issue.enteredBy?.name || '—')}</td>
        <td><span class="badge" style="background:${st.color}22;color:${st.color};border:1px solid ${st.color}44">${esc(st.label)}</span></td>`;
      tr.addEventListener('click', () => issuePanel.show(issue, () => loadIssues(currentProject)));
      tbody.append(tr);
    });

    table.append(tbody);
    wrap.append(table);
    recordsArea.append(wrap);
  }

  // ── Open detail panel for a document
  async function openDetail(doc) {
    detailPanel.show(doc, currentProject);

    if (doc.currentVersionID) {
      detailPanel.setApprovalLoading();
      try {
        const reviewers = await api({ resource: 'approval', docVersionId: doc.currentVersionID });
        detailPanel.setApprovals(Array.isArray(reviewers) ? reviewers : []);
      } catch (e) {
        detailPanel.setApprovalError(e.message);
      }
    }
  }
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function buildDetailPanel() {
  const panel = document.createElement('div');
  panel.className = 'detail-panel';

  const header = document.createElement('div');
  header.className = 'detail-header';
  const nameEl = document.createElement('span');
  nameEl.className = 'detail-name';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-close';
  closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
  </svg>`;
  closeBtn.addEventListener('click', () => panel.classList.remove('open'));
  header.append(nameEl, closeBtn);

  const openLink = document.createElement('a');
  openLink.className = 'detail-open';
  openLink.target = '_blank';
  openLink.rel = 'noopener';
  openLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
  </svg> Open in Workfront`;

  const body = document.createElement('div');
  body.className = 'detail-body';

  panel.append(header, openLink, body);
  document.body.append(panel);

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') panel.classList.remove('open'); });

  panel.show = (doc, project) => {
    nameEl.textContent = doc.name || '(Untitled)';
    openLink.href = `https://${WF_DOMAIN}/document/${doc.ID}/details`;

    body.innerHTML = `
      <div class="detail-field">
        <div class="detail-field-label">Project</div>
        <div class="detail-field-value">${esc(project?.name || '—')}</div>
      </div>
      <div class="detail-field">
        <div class="detail-field-label">Owner</div>
        <div class="detail-field-value">${esc(doc.owner?.name || '—')}</div>
      </div>
      <div class="detail-field">
        <div class="detail-field-label">Last Modified</div>
        <div class="detail-field-value">${esc(formatDate(doc.lastModDate))}</div>
      </div>
      ${doc.description ? `<div class="detail-field">
        <div class="detail-field-label">Description</div>
        <div class="detail-field-value">${esc(doc.description)}</div>
      </div>` : ''}
      <div class="detail-section-title">Approvals</div>
      <div id="approval-list"><div class="spinner-wrap"><div class="spinner"></div></div></div>`;

    panel.classList.add('open');
  };

  panel.setApprovalLoading = () => {
    const el = body.querySelector('#approval-list');
    if (el) el.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  };

  panel.setApprovals = (reviewers) => {
    const el = body.querySelector('#approval-list');
    if (!el) return;
    if (!reviewers.length) {
      el.innerHTML = '<p style="color:#aaa;font-size:13px;padding:4px 0">No approvals on this version.</p>';
      return;
    }
    el.innerHTML = reviewers.map((r) => {
      const st = APPROVAL_STATUS[r.approverDecision] || APPROVAL_STATUS[r.status] || { label: r.approverDecision || r.status || '—', color: '#888' };
      return `<div class="approval-row">
        <div class="approval-reviewer">${esc(r.reviewer?.name || r.reviewer?.emailAddr || '—')}</div>
        <span class="badge" style="background:${st.color}22;color:${st.color};border:1px solid ${st.color}44">${esc(st.label)}</span>
        ${r.reviewDate ? `<div class="approval-date">${esc(formatDate(r.reviewDate))}</div>` : ''}
      </div>`;
    }).join('');
  };

  panel.setApprovalError = (msg) => {
    const el = body.querySelector('#approval-list');
    if (el) el.innerHTML = `<p class="error" style="font-size:13px">${esc(msg)}</p>`;
  };

  return panel;
}

// ── Issue edit panel ──────────────────────────────────────────────────────────

function buildIssuePanel(apiFn) {
  // Colors for well-known equatesWith system statuses
  const STATUS_COLORS = {
    NEW: '#1473e6', INP: '#e68619', CPL: '#2d9d78',
    RES: '#2d9d78', CLO: '#888', ONH: '#888',
  };
  const FALLBACK_STATUS_OPTIONS = [
    { value: 'NEW', label: 'New',         color: '#1473e6' },
    { value: 'INP', label: 'In Progress', color: '#e68619' },
    { value: 'ONH', label: 'On Hold',     color: '#888' },
    { value: 'CPL', label: 'Complete',    color: '#2d9d78' },
  ];
  let cachedStatusOptions = null;

  const panel = document.createElement('div');
  panel.className = 'detail-panel';

  const header = document.createElement('div');
  header.className = 'detail-header';
  const nameEl = document.createElement('span');
  nameEl.className = 'detail-name';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-close';
  closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
  </svg>`;
  closeBtn.addEventListener('click', () => panel.classList.remove('open'));
  header.append(nameEl, closeBtn);

  const body = document.createElement('div');
  body.className = 'detail-body';
  panel.append(header, body);
  document.body.append(panel);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') panel.classList.remove('open'); });

  panel.show = async (issue, onSaved) => {
    nameEl.textContent = issue.name || '(Untitled)';
    panel.classList.add('open');
    body.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

    // Fetch real statuses on first open
    if (!cachedStatusOptions) {
      try {
        const raw = await apiFn({ resource: 'issue_statuses' });
        const list = Array.isArray(raw) ? raw : [];
        if (list.length) {
          cachedStatusOptions = list.map((s) => ({
            value: s.key,
            label: s.label,
            color: STATUS_COLORS[s.equatesWith] || STATUS_COLORS[s.key] || '#888',
          }));
        }
      } catch { /* fall through to fallback */ }
      if (!cachedStatusOptions) cachedStatusOptions = FALLBACK_STATUS_OPTIONS;
    }

    const statusOptions = cachedStatusOptions;
    body.innerHTML = '';

    let selectedStatus = issue.status || statusOptions[0]?.value || 'NEW';
    let selectedUserId = issue.assignedTo?.ID || null;
    let selectedUserName = issue.assignedTo?.name || null;

    // ── Status field
    const statusLabel = document.createElement('div');
    statusLabel.className = 'detail-field-label';
    statusLabel.textContent = 'Status';
    statusLabel.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#888;margin-bottom:6px';

    const statusBtns = document.createElement('div');
    statusBtns.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px';
    statusOptions.forEach(({ value, label, color }) => {
      const btn = document.createElement('button');
      btn.className = 'issue-status-btn';
      btn.dataset.value = value;
      btn.textContent = label;
      btn.style.cssText = `border:1px solid ${color}44;background:${selectedStatus === value ? color : color + '11'};color:${selectedStatus === value ? '#fff' : color};border-radius:12px;padding:4px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .1s,color .1s`;
      btn.addEventListener('click', () => {
        selectedStatus = value;
        statusBtns.querySelectorAll('.issue-status-btn').forEach((b) => {
          const opt = statusOptions.find((o) => o.value === b.dataset.value);
          const active = b.dataset.value === selectedStatus;
          b.style.background = active ? opt.color : opt.color + '11';
          b.style.color = active ? '#fff' : opt.color;
        });
      });
      statusBtns.append(btn);
    });

    // ── Assigned To field
    const assignLabel = document.createElement('div');
    assignLabel.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#888;margin-bottom:6px';
    assignLabel.textContent = 'Assigned To';

    const currentAssignee = document.createElement('div');
    currentAssignee.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;min-height:24px';

    const assigneeChip = document.createElement('span');
    assigneeChip.className = 'modal-assignee-chip';
    assigneeChip.style.display = selectedUserName ? '' : 'none';
    assigneeChip.textContent = selectedUserName || '';

    const clearBtn = document.createElement('button');
    clearBtn.style.cssText = 'background:none;border:none;color:#888;cursor:pointer;font-size:16px;line-height:1;padding:0';
    clearBtn.title = 'Remove assignee';
    clearBtn.innerHTML = '&times;';
    clearBtn.style.display = selectedUserName ? '' : 'none';
    clearBtn.addEventListener('click', () => {
      selectedUserId = null;
      selectedUserName = null;
      assigneeChip.style.display = 'none';
      clearBtn.style.display = 'none';
      userSearchInput.value = '';
    });
    currentAssignee.append(assigneeChip, clearBtn);

    const userSearchInput = document.createElement('input');
    userSearchInput.className = 'modal-input';
    userSearchInput.placeholder = 'Search people…';
    userSearchInput.style.cssText = 'width:100%;box-sizing:border-box;font-size:13px';

    const userResults = document.createElement('div');
    userResults.className = 'user-results';

    let searchTimer;
    userSearchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = userSearchInput.value.trim();
      userResults.innerHTML = '';
      if (!q) return;
      searchTimer = setTimeout(async () => {
        userResults.innerHTML = '<div style="padding:6px 10px;font-size:12px;color:#888">Searching…</div>';
        try {
          const users = await apiFn({ resource: 'search_users', query: q });
          userResults.innerHTML = '';
          const list = Array.isArray(users) ? users : [];
          if (!list.length) {
            userResults.innerHTML = '<div style="padding:6px 10px;font-size:12px;color:#888">No results</div>';
            return;
          }
          list.forEach((u) => {
            const item = document.createElement('div');
            item.className = 'user-result-item';
            item.innerHTML = `<strong style="font-size:13px">${esc(u.name)}</strong> <span style="font-size:11px;color:#888">${esc(u.emailAddr || '')}</span>`;
            item.addEventListener('click', () => {
              selectedUserId = u.ID;
              selectedUserName = u.name;
              assigneeChip.textContent = u.name;
              assigneeChip.style.display = '';
              clearBtn.style.display = '';
              userSearchInput.value = '';
              userResults.innerHTML = '';
            });
            userResults.append(item);
          });
        } catch {
          userResults.innerHTML = '<div style="padding:6px 10px;font-size:12px;color:#c00">Search failed</div>';
        }
      }, 300);
    });

    // ── Save / Cancel
    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid #f0f0f0';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'modal-btn-primary';
    saveBtn.textContent = 'Save';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => panel.classList.remove('open'));
    footer.append(saveBtn, cancelBtn);

    const errorEl = document.createElement('p');
    errorEl.className = 'modal-error';
    errorEl.style.display = 'none';

    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      errorEl.style.display = 'none';
      try {
        const updateParams = { resource: 'update_issue', issueId: issue.ID };
        if (selectedStatus !== issue.status) updateParams.status = selectedStatus;
        if (selectedUserId && selectedUserId !== issue.assignedTo?.ID) updateParams.assignedToID = selectedUserId;
        await apiFn(updateParams);
        panel.classList.remove('open');
        if (onSaved) onSaved();
      } catch (e) {
        errorEl.textContent = e.message;
        errorEl.style.display = '';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    });

    body.append(statusLabel, statusBtns, assignLabel, currentAssignee, userSearchInput, userResults, errorEl, footer);
  };

  return panel;
}

// ── Extra CSS injected for approval rows + badges ─────────────────────────────

const style = document.createElement('style');
style.textContent = `
  .btn-new-task { display:flex; align-items:center; gap:5px; padding:5px 12px; background:#1473e6; color:#fff; border:none; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; margin-left:8px; }
  .btn-new-task:hover { background:#0d66d0; }
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1000; }
  .modal { background:#fff; border-radius:8px; width:580px; max-width:calc(100vw - 32px); box-shadow:0 8px 32px rgba(0,0,0,.22); display:flex; flex-direction:column; max-height:90vh; overflow:auto; }
  .modal-header { display:flex; align-items:center; gap:12px; padding:20px 24px 0; }
  .modal-icon { width:36px; height:36px; background:#0099b0; border-radius:6px; display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; }
  .modal-title { font-size:18px; font-weight:700; color:#1d1d1d; }
  .modal-body { padding:20px 24px; display:flex; flex-direction:column; gap:16px; }
  .modal-field { display:flex; flex-direction:column; gap:6px; }
  .modal-row { flex-direction:row !important; gap:16px; }
  .modal-label { font-size:13px; font-weight:600; color:#333; }
  .modal-input { padding:8px 12px; border:1px solid #d0d0d0; border-radius:4px; font-size:14px; font-family:inherit; outline:none; }
  .modal-input:focus { border-color:#1473e6; box-shadow:0 0 0 2px #1473e622; }
  .modal-input--error { border-color:#d7373f !important; box-shadow:0 0 0 2px #d7373f22 !important; }
  .modal-textarea { padding:8px 12px; border:1px solid #d0d0d0; border-radius:4px; font-size:14px; font-family:inherit; resize:vertical; min-height:80px; outline:none; }
  .modal-textarea:focus { border-color:#1473e6; box-shadow:0 0 0 2px #1473e622; }
  .modal-charcount { font-size:11px; color:#aaa; }
  .modal-assign-row { display:flex; align-items:center; gap:8px; }
  .modal-assignee-chip { background:#e8f4fd; color:#1473e6; border:1px solid #1473e644; border-radius:12px; padding:3px 10px; font-size:12px; font-weight:600; }
  .modal-assign-me { background:none; border:none; color:#1473e6; font-size:13px; font-weight:600; cursor:pointer; padding:0; text-decoration:underline; font-family:inherit; }
  .modal-assign-me:hover { color:#0d66d0; }
  .user-results { border:1px solid #e0e0e0; border-radius:4px; margin-top:4px; overflow:hidden; background:#fff; }
  .user-results:empty { display:none; }
  .user-result-item { padding:8px 12px; cursor:pointer; border-bottom:1px solid #f5f5f5; }
  .user-result-item:last-child { border-bottom:none; }
  .user-result-item:hover { background:#f0f4ff; }
  .modal-footer { display:flex; align-items:center; gap:10px; padding:16px 24px 20px; border-top:1px solid #f0f0f0; flex-wrap:wrap; }
  .modal-btn-primary { padding:8px 20px; background:#1473e6; color:#fff; border:none; border-radius:20px; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; }
  .modal-btn-primary:hover { background:#0d66d0; }
  .modal-btn-primary:disabled { background:#aaa; cursor:not-allowed; }
  .modal-btn-cancel { padding:8px 20px; background:none; border:1px solid #d0d0d0; border-radius:20px; font-size:14px; font-weight:600; cursor:pointer; color:#333; font-family:inherit; }
  .modal-btn-cancel:hover { background:#f5f5f5; }
  .modal-error { color:#d7373f; font-size:12px; margin:0; flex-basis:100%; }
  .tab-bar { display:flex; gap:2px; margin:0 4px; }
  .tab-btn { padding:3px 12px; font-size:12px; font-weight:600; border:1px solid transparent; border-bottom:none; border-radius:4px 4px 0 0; background:none; color:#888; cursor:pointer; font-family:inherit; }
  .tab-btn:hover { color:#1473e6; }
  .tab-btn.active { background:#fff; color:#1473e6; border-color:#e0e0e0; border-bottom-color:#fff; }
  .filter-bar { display:flex; gap:4px; padding:8px 12px 4px; }
  .filter-btn { flex:1; padding:4px 0; font-size:11px; font-weight:600; border:1px solid #d0d0d0; border-radius:4px; background:#fff; color:#555; cursor:pointer; font-family:inherit; transition:background .12s,color .12s; }
  .filter-btn:hover { background:#f0f4ff; color:#1473e6; border-color:#1473e6; }
  .filter-btn.active { background:#1473e6; color:#fff; border-color:#1473e6; }
  .badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; }
  .badge--blue { background:#1473e622; color:#1473e6; border:1px solid #1473e644; }
  .approval-row { display:flex; align-items:center; gap:8px; padding:7px 0; border-bottom:1px solid #f2f2f2; }
  .approval-row:last-child { border-bottom:none; }
  .approval-reviewer { flex:1; font-size:13px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .approval-date { font-size:11px; color:#888; white-space:nowrap; }
  .detail-section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:#888; margin:18px 0 8px; }
  .action-cell { text-align:right; }
  .btn-view { background:none; border:1px solid #e0e0e0; border-radius:4px; padding:3px 10px; font-size:12px; cursor:pointer; color:#1473e6; font-family:inherit; }
  .btn-view:hover { background:#f0f4ff; }
`;
document.head.append(style);

// ── Init ──────────────────────────────────────────────────────────────────────

(async function init() {
  await Promise.race([DA_SDK, new Promise((r) => setTimeout(r, 1500))]);

  const token = await ensureToken();
  if (!token) { showConnectScreen(); return; }

  document.body.innerHTML = '<p class="loading">Loading Workfront projects…</p>';

  try {
    await buildApp();
  } catch (err) {
    document.body.innerHTML = `<p class="loading error">${err.message}</p>`;
  }
}());
