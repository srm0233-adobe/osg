// This action's own URL — registered with Workfront as the single, permanent
// OAuth redirect URI. It never changes (shared Runtime namespace), so any
// site that calls this action gets working Workfront login with zero
// per-site changes to the Workfront OAuth client's allowlist.
const RUNTIME_URL = 'https://3635370-144scarletlobster.adobeioruntime.net/api/v1/web/default/workfront-planning';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function tokenRequest(domain, body) {
  const resp = await fetch(`https://${domain}/integrations/oauth2/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return resp.json();
}

// Renders the page that lands in the popup after Workfront redirects back here.
// It hands the tokens to the calling site via postMessage(targetOrigin), where
// targetOrigin is the caller's own origin, passed through untouched via `state`.
function relayPage(tokens, state) {
  const targetOrigin = /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(state || '') ? state : null;
  const ok = Boolean(tokens && tokens.access_token);
  const text = ok
    ? 'Connected to Workfront — you can close this tab.'
    : `Workfront authorization failed: ${esc((tokens && (tokens.error_description || tokens.error)) || 'unknown error')}`;
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:0 20px">
<p>${text}</p>
<script>
(function () {
  var origin = ${JSON.stringify(targetOrigin)};
  var payload = ${JSON.stringify({ type: 'wf_tokens', ...tokens })};
  if (origin && window.opener) {
    try { window.opener.postMessage(payload, origin); } catch (e) {}
  }
  setTimeout(function () { window.close(); }, 600);
}());
</script>
</body></html>`;
}

function wfRequest(method, path, domain, token, body) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://${domain}/attask/api/v18.0${path}${sep}sessionID=${encodeURIComponent(token)}`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(url, opts).then((r) => r.json());
}

async function main(params) {
  if (params.__ow_method === 'OPTIONS') {
    return { statusCode: 204 };
  }

  const clientId = params.WF_CLIENT_ID;
  const clientSecret = params.WF_CLIENT_SECRET;
  const domain = params.WF_DOMAIN;

  if (!clientId || !clientSecret || !domain) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing WF_CLIENT_ID, WF_CLIENT_SECRET, or WF_DOMAIN' }) };
  }

  // OAuth relay landing: Workfront redirects the browser here (not an AJAX
  // call) after login, with ?code=...&state=<caller origin>.
  if (params.code) {
    try {
      const tokens = await tokenRequest(domain, {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: params.code,
        redirect_uri: RUNTIME_URL,
      });
      return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: relayPage(tokens, params.state) };
    } catch (err) {
      return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: relayPage({ error: err.message }, params.state) };
    }
  }

  const resource = params.resource || 'projects';

  try {
    if (resource === 'refresh_token') {
      const refreshToken = params.refresh_token;
      if (!refreshToken) return { statusCode: 400, body: JSON.stringify({ error: 'Missing refresh_token' }) };
      const tokens = await tokenRequest(domain, {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      });
      return { statusCode: 200, body: JSON.stringify(tokens) };
    }

    const token = params.wf_token;
    if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };

    const projectId = params.projectId || null;
    const docVersionId = params.docVersionId || null;
    const limit = Number(params.limit) || 100;
    let data;

    if (resource === 'projects') {
      let filterQs = '';
      if (params.filter === 'owner') {
        filterQs = '&ownerID=$$USER.ID';
      } else {
        // "I'm On" — only projects where the current user is a team member
        filterQs = '&projectUsers:userID=$$USER.ID';
      }
      data = await wfRequest('GET',
        `/PROJ/search?fields=ID,name,status,percentComplete,plannedCompletionDate,owner:name&$$LIMIT=${limit}&$$FIRST=0${filterQs}`,
        domain, token);
    } else if (resource === 'documents' && projectId) {
      data = await wfRequest('GET',
        `/DOCU/search?projectID=${projectId}&fields=ID,name,docObjCode,currentVersionID,description,owner:name,lastModDate&$$LIMIT=${limit}`,
        domain, token);
    } else if (resource === 'approval' && docVersionId) {
      data = await wfRequest('GET',
        `/DOCAPVRS/search?documentVersionID=${docVersionId}&fields=ID,status,approverDecision,reviewer:name,reviewer:emailAddr,reviewDate&$$LIMIT=50`,
        domain, token);
    } else if (resource === 'tasks' && projectId) {
      data = await wfRequest('GET',
        `/TASK/search?projectID=${projectId}&fields=ID,taskNumber,name,status,percentComplete,assignedTo:name,plannedCompletionDate&$$FIRST=0&$$LIMIT=${limit}`,
        domain, token);
    } else if (resource === 'issues' && projectId) {
      data = await wfRequest('GET',
        `/OPTASK/search?projectID=${projectId}&fields=ID,name,status,priority,assignedTo:name,plannedCompletionDate,enteredBy:name,entryDate&$$FIRST=0&$$LIMIT=${limit}`,
        domain, token);
    } else if (resource === 'create_issue') {
      if (!params.name) return { statusCode: 400, body: JSON.stringify({ error: 'Issue name is required' }) };
      if (!projectId) return { statusCode: 400, body: JSON.stringify({ error: 'projectId is required' }) };
      const issueBody = { name: params.name, projectID: projectId };
      if (params.description) issueBody.description = params.description;
      if (params.plannedCompletionDate) issueBody.plannedCompletionDate = params.plannedCompletionDate;
      if (params.priority != null) issueBody.priority = Number(params.priority);
      if (params.assignedToID) issueBody.assignedToID = params.assignedToID;
      data = await wfRequest('POST', `/OPTASK?fields=ID,name,status,priority`, domain, token, issueBody);
    } else if (resource === 'issue_statuses') {
      data = await wfRequest('GET', `/CSOBJ/search?objCode=OPTASK&fields=ID,key,label,equatesWith&$$LIMIT=100`, domain, token);
    } else if (resource === 'search_users') {
      const q = params.query || '';
      if (!q) return { statusCode: 400, body: JSON.stringify({ error: 'query required' }) };
      data = await wfRequest('GET',
        `/USER/search?name=${encodeURIComponent(q)}&name_Mod=cicontains&fields=ID,name,emailAddr&$$LIMIT=10`,
        domain, token);
    } else if (resource === 'update_issue') {
      const issueId = params.issueId;
      if (!issueId) return { statusCode: 400, body: JSON.stringify({ error: 'issueId required' }) };
      const body = {};
      if (params.status) body.status = params.status;
      if (params.assignedToID) body.assignedToID = params.assignedToID;
      data = await wfRequest('PUT',
        `/OPTASK/${issueId}?fields=ID,name,status,assignedTo:name`,
        domain, token, body);
    } else if (resource === 'current_user') {
      data = await wfRequest('GET', `/USER/search?ID=$$USER.ID&fields=ID,name,emailAddr&$$LIMIT=1`, domain, token);
    } else if (resource === 'create_task') {
      if (!params.name) return { statusCode: 400, body: JSON.stringify({ error: 'Task name is required' }) };
      if (!projectId) return { statusCode: 400, body: JSON.stringify({ error: 'projectId is required' }) };
      const taskBody = { name: params.name, projectID: projectId };
      if (params.description) taskBody.description = params.description;
      if (params.plannedCompletionDate) taskBody.plannedCompletionDate = params.plannedCompletionDate;
      if (params.duration) { taskBody.duration = Number(params.duration); taskBody.durationUnit = 'D'; }
      if (params.assignedToID) taskBody.assignedToID = params.assignedToID;
      data = await wfRequest('POST', `/TASK?fields=ID,name,taskNumber,status`, domain, token, taskBody);
    } else if (resource === 'update_task') {
      const taskId = params.taskId;
      if (!taskId) return { statusCode: 400, body: JSON.stringify({ error: 'taskId required' }) };
      const body = {};
      if (params.status) body.status = params.status;
      if (params.percentComplete != null) body.percentComplete = Number(params.percentComplete);
      data = await wfRequest('PUT', `/TASK/${taskId}?fields=ID,name,status,percentComplete`, domain, token, body);
    } else if (resource === 'task_statuses') {
      data = await wfRequest('GET', `/CSOBJ/search?objCode=TASK&fields=ID,key,label,equatesWith&$$LIMIT=100`, domain, token);
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: `Unknown resource "${resource}"` }) };
    }

    // Surface Workfront-level errors clearly
    if (data && data.error) {
      const msg = typeof data.error === 'string' ? data.error
        : data.error.message || JSON.stringify(data.error);
      return { statusCode: 400, body: JSON.stringify({ error: msg, raw: data.error }) };
    }

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

exports.main = main;
