const RUNTIME_URL = 'https://3635370-144scarletlobster.adobeioruntime.net/api/v1/web/default/workfront-planning';
const RUNTIME_ORIGIN = new URL(RUNTIME_URL).origin;
const WF_DOMAIN = 'aemshowcase2.my.workfront.com';
const WF_CLIENT_ID = '56e219a0a1eeae8feb55c444e3d8a8b6';

// ── Auth ──────────────────────────────────────────────────────────────────────

function storedToken() {
  const token = localStorage.getItem('wf_access_token');
  const expiry = Number(localStorage.getItem('wf_token_expiry') || 0);
  if (token && expiry && Date.now() > expiry) { localStorage.removeItem('wf_access_token'); return null; }
  return token || null;
}
function storedRefresh() { return localStorage.getItem('wf_refresh_token'); }
function saveTokens({ access_token, refresh_token, expires_in }) {
  if (access_token) {
    localStorage.setItem('wf_access_token', access_token);
    localStorage.setItem('wf_token_expiry', String(Date.now() + (Number(expires_in) || 36000) * 1000));
  }
  if (refresh_token) localStorage.setItem('wf_refresh_token', refresh_token);
}

async function runtimeCall(params) {
  const resp = await fetch(`${RUNTIME_URL}?${new URLSearchParams(params)}`);
  if (!resp.ok) throw new Error(`Runtime ${resp.status}`);
  return resp.json();
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
  return null;
}

async function api(params) {
  const token = await ensureToken();
  if (!token) return null;
  return runtimeCall({ ...params, wf_token: token });
}

init();

// ── UI helpers ────────────────────────────────────────────────────────────────

function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function css(styles) {
  const s = document.createElement('style');
  s.textContent = styles;
  document.head.append(s);
}

css(`
  .ap-shell { display: flex; flex-direction: column; height: 400px; }
  .ap-header {
    padding: 12px 16px 10px;
    border-bottom: 1px solid #e5e5e5;
    display: flex; align-items: center; gap: 10px;
  }
  .ap-logo {
    background: #ffcb00; color: #1a1a1a;
    font-weight: 900; font-size: 12px;
    padding: 3px 5px; border-radius: 3px;
    flex-shrink: 0;
  }
  .ap-title { font-weight: 700; font-size: 15px; }
  .ap-body { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
  .ap-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #888; margin-bottom: 4px; }
  .ap-select, .ap-search {
    width: 100%; padding: 7px 10px;
    border: 1px solid #ccc; border-radius: 4px;
    font-family: inherit; font-size: 13px; color: #222;
    background: #fff; outline: none;
  }
  .ap-select:focus, .ap-search:focus { border-color: #1473e6; }
  .task-list { display: flex; flex-direction: column; gap: 4px; flex: 1; overflow-y: auto; }
  .task-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 5px;
    background: #fafafa; gap: 8px; cursor: default;
    transition: border-color .12s;
  }
  .task-item:hover { border-color: #bbb; background: #fff; }
  .task-item.done { opacity: .55; }
  .task-name { font-size: 13px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .task-status-tag {
    font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 10px;
    flex-shrink: 0;
  }
  .tag-cpl { background: #d9f2e6; color: #1a7240; }
  .tag-other { background: #f0f0f0; color: #555; }
  .btn-complete {
    flex-shrink: 0; padding: 4px 10px;
    background: #2d9d78; color: #fff; border: none;
    border-radius: 4px; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: inherit;
    transition: background .12s;
  }
  .btn-complete:hover { background: #258c6b; }
  .btn-complete:disabled { background: #aaa; cursor: not-allowed; }
  .ap-empty { color: #888; font-size: 13px; text-align: center; padding: 20px 0; }
  .ap-spinner { text-align: center; padding: 20px 0; color: #888; font-size: 13px; }
  .ap-connect { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 14px; text-align: center; padding: 20px; }
  .ap-connect p { color: #555; font-size: 13px; margin: 0; }
  .btn-connect {
    padding: 9px 20px; background: #1473e6; color: #fff;
    border: none; border-radius: 4px; font-size: 14px; font-weight: 600;
    cursor: pointer; font-family: inherit;
  }
  .btn-connect:hover { background: #0d66d0; }
  .ap-toast {
    position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%) translateY(40px);
    background: #2d9d78; color: #fff; padding: 7px 16px; border-radius: 4px;
    font-size: 13px; font-weight: 600; opacity: 0; transition: opacity .2s, transform .2s;
    pointer-events: none; white-space: nowrap;
  }
  .ap-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  .ap-toast.error { background: #c9252d; }
`);

let toastTimer;
function showToast(msg, type = 'success') {
  let t = document.querySelector('.ap-toast');
  if (!t) { t = el('div', 'ap-toast'); document.body.append(t); }
  t.textContent = msg;
  t.className = `ap-toast ${type}`;
  clearTimeout(toastTimer);
  requestAnimationFrame(() => {
    t.classList.add('show');
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  });
}

// ── Main app ──────────────────────────────────────────────────────────────────

async function init() {
  const token = await ensureToken();
  if (!token) { renderConnect(); return; }
  renderApp();
}

function renderConnect() {
  document.body.innerHTML = '';
  const shell = el('div', 'ap-shell');
  const header = el('div', 'ap-header');
  header.innerHTML = `<span class="ap-logo">CAT</span><span class="ap-title">Mark Task Complete</span>`;
  const body = el('div', 'ap-connect');
  body.innerHTML = `<p>Connect your Workfront account to mark tasks as complete.</p>`;
  const btn = el('button', 'btn-connect', 'Connect Workfront');
  btn.addEventListener('click', () => {
    // Redirect URI is the Runtime action itself — a fixed, domain-independent
    // URL registered once with Workfront. It exchanges the code and
    // postMessages the tokens back to this page's origin (passed via `state`).
    const url = `https://${WF_DOMAIN}/integrations/oauth2/authorize?`
      + `client_id=${WF_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(RUNTIME_URL)}`
      + `&state=${encodeURIComponent(location.origin)}`;
    window.open(url, '_blank', 'width=620,height=720');

    const onMessage = (e) => {
      if (e.origin === RUNTIME_ORIGIN && e.data?.type === 'wf_tokens') {
        window.removeEventListener('message', onMessage);
        saveTokens(e.data);
        init();
      }
    };
    window.addEventListener('message', onMessage);
  });
  body.append(btn);
  shell.append(header, body);
  document.body.append(shell);
}

async function renderApp() {
  document.body.innerHTML = '';
  const shell = el('div', 'ap-shell');

  const header = el('div', 'ap-header');
  header.innerHTML = `<span class="ap-logo">CAT</span><span class="ap-title">Mark Task Complete</span>`;

  const body = el('div', 'ap-body');

  // Project selector
  const projGroup = el('div');
  const projLabel = el('div', 'ap-label', 'Project');
  const projSelect = el('select', 'ap-select');
  projSelect.innerHTML = '<option value="">Loading projects…</option>';
  projGroup.append(projLabel, projSelect);

  // Task area
  const taskGroup = el('div');
  taskGroup.style.flex = '1';
  taskGroup.style.display = 'flex';
  taskGroup.style.flexDirection = 'column';
  taskGroup.style.overflow = 'hidden';

  const taskLabel = el('div', 'ap-label', 'Tasks');
  const taskSearch = el('input', 'ap-search');
  taskSearch.placeholder = 'Filter tasks…';
  taskSearch.type = 'search';
  taskSearch.style.display = 'none';

  const taskList = el('div', 'task-list');
  taskList.innerHTML = `<div class="ap-empty">Select a project to see tasks</div>`;

  taskGroup.append(taskLabel, taskSearch, taskList);
  body.append(projGroup, taskGroup);
  shell.append(header, body);
  document.body.append(shell);

  // Load projects
  let allTasks = [];
  try {
    const data = await api({ resource: 'projects', filter: 'member' });
    const projects = data?.data || [];
    if (!projects.length) {
      projSelect.innerHTML = '<option value="">No projects found</option>';
    } else {
      projSelect.innerHTML = '<option value="">Select a project…</option>'
        + projects.map((p) => `<option value="${esc(p.ID)}">${esc(p.name)}</option>`).join('');
    }
  } catch {
    projSelect.innerHTML = '<option value="">Failed to load projects</option>';
  }

  projSelect.addEventListener('change', async () => {
    const projectId = projSelect.value;
    if (!projectId) {
      taskList.innerHTML = `<div class="ap-empty">Select a project to see tasks</div>`;
      taskSearch.style.display = 'none';
      allTasks = [];
      return;
    }
    taskSearch.style.display = 'none';
    taskList.innerHTML = `<div class="ap-spinner">Loading tasks…</div>`;
    try {
      const data = await api({ resource: 'tasks', projectId });
      allTasks = data?.data || [];
      taskSearch.value = '';
      taskSearch.style.display = allTasks.length > 4 ? '' : 'none';
      renderTasks(allTasks, taskList);
    } catch {
      taskList.innerHTML = `<div class="ap-empty">Failed to load tasks</div>`;
    }
  });

  taskSearch.addEventListener('input', () => {
    const q = taskSearch.value.toLowerCase();
    renderTasks(allTasks.filter((t) => t.name.toLowerCase().includes(q)), taskList);
  });
}

function renderTasks(tasks, container) {
  container.innerHTML = '';
  if (!tasks.length) {
    container.innerHTML = `<div class="ap-empty">No tasks found</div>`;
    return;
  }
  tasks.forEach((task) => {
    const isDone = task.status === 'CPL';
    const item = el('div', `task-item${isDone ? ' done' : ''}`);

    const name = el('span', 'task-name', esc(task.name));
    const tag = el('span', `task-status-tag ${isDone ? 'tag-cpl' : 'tag-other'}`, isDone ? 'Complete' : (task.status || '—'));

    item.append(name, tag);

    if (!isDone) {
      const btn = el('button', 'btn-complete', 'Complete');
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = '…';
        try {
          await api({ resource: 'update_task', taskId: task.ID, status: 'CPL', percentComplete: 100 });
          task.status = 'CPL';
          item.classList.add('done');
          tag.textContent = 'Complete';
          tag.className = 'task-status-tag tag-cpl';
          btn.remove();
          showToast(`"${task.name}" marked complete`);
        } catch {
          btn.disabled = false;
          btn.textContent = 'Complete';
          showToast('Failed to update task', 'error');
        }
      });
      item.append(btn);
    }

    container.append(item);
  });
}
