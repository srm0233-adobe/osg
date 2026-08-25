#!/usr/bin/env node
/**
 * Deploy the Workfront Planning Runtime action.
 *
 * Usage:
 *   DA_TOKEN=eyJ... AIO_RUNTIME_AUTH=<auth> AIO_RUNTIME_NAMESPACE=3635370-144scarletlobster node tools/workfront/deploy.mjs
 *
 * Where to get AIO_RUNTIME_AUTH + AIO_RUNTIME_NAMESPACE:
 *   1. Go to https://developer.adobe.com/console
 *   2. Open the Adobe Developer Console project whose Runtime namespace is
 *      "3635370-144scarletlobster" (this is the namespace baked into
 *      RUNTIME_URL in workfront.js/approval.js/cms-tool.js) → Production workspace
 *   3. Click "Download all" → opens a .json credential file
 *   4. The file contains "runtime" → { "namespace", "auth" }
 *
 * DA_TOKEN: grab from DevTools on da.live (Authorization: Bearer … header).
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dir = dirname(fileURLToPath(import.meta.url));

// ── Env checks ────────────────────────────────────────────────────────────────
const daToken = process.env.DA_TOKEN;
const runtimeAuth = process.env.AIO_RUNTIME_AUTH;
const runtimeNamespace = process.env.AIO_RUNTIME_NAMESPACE || '3635370-144scarletlobster';
const runtimeApiHost = process.env.AIO_RUNTIME_APIHOST || 'https://adobeioruntime.net';

if (!daToken) {
  console.error('❌  Set DA_TOKEN env var (grab Bearer token from da.live DevTools)');
  process.exit(1);
}
if (!runtimeAuth) {
  console.error('❌  Set AIO_RUNTIME_AUTH env var');
  console.error('   1. Go to https://developer.adobe.com/console');
  console.error('   2. Open the project with Runtime namespace "3635370-144scarletlobster" → Production workspace');
  console.error('   3. Click "Download all" → get runtime.auth from the JSON');
  process.exit(1);
}

// ── Read WF credentials from DA sheet ────────────────────────────────────────
console.log('📄  Reading credentials from DA sheet…');
const sheetResp = await fetch('https://content.da.live/ynaka-adobe/da-demo-kit/.da/adobe-workfront.json', {
  headers: { Authorization: `Bearer ${daToken}` },
});
if (!sheetResp.ok) {
  console.error(`❌  DA sheet read failed: ${sheetResp.status} ${sheetResp.statusText}`);
  process.exit(1);
}
const { data } = await sheetResp.json();
const get = (key) => data.find((r) => r.key === key)?.value;

const clientId = get('clientId');
const clientSecret = get('clientSecret');
// Sheet stores either a full "domain" (e.g. foo.my.workfront.com) or a short
// "tenant" name (e.g. foo) that needs the standard suffix appended.
const tenant = get('tenant');
const domain = get('domain') || (tenant && !tenant.includes('.') ? `${tenant}.my.workfront.com` : tenant) || 'adoberm.my.workfront.com';

if (!clientId || !clientSecret) {
  console.error('❌  Missing clientId or clientSecret in .da/adobe-workfront sheet');
  process.exit(1);
}
console.log(`✅  Credentials loaded (domain: ${domain})`);

// ── Verify action.zip exists ──────────────────────────────────────────────────
const zipPath = join(dir, 'actions/workfront/action.zip');
try { readFileSync(zipPath); } catch {
  console.error(`❌  action.zip not found at ${zipPath}`);
  console.error('   Run: cd tools/workfront/actions/workfront && zip -j action.zip index.js');
  process.exit(1);
}

// ── Deploy via aio runtime ────────────────────────────────────────────────────
const actionName = 'workfront-planning';
const cmd = [
  'aio runtime action update',
  `${runtimeNamespace}/default/${actionName}`,
  `"${zipPath}"`,
  '--kind nodejs:18',
  '--web true',
  `--param WF_CLIENT_ID "${clientId}"`,
  `--param WF_CLIENT_SECRET "${clientSecret}"`,
  `--param WF_DOMAIN "${domain}"`,
  `-u "${runtimeAuth}"`,
  `--apihost "${runtimeApiHost}"`,
].join(' \\\n  ');

console.log(`\n🚀  Deploying action: ${runtimeNamespace}/default/${actionName}`);
console.log('    (credentials are passed as action params — not in the zip)\n');

try {
  execSync(cmd, { stdio: 'inherit' });
} catch {
  console.error('\n❌  Deployment failed. Run with --verbose for details.');
  process.exit(1);
}

// ── Print the Runtime URL ─────────────────────────────────────────────────────
const nsSlug = runtimeNamespace.replace('_', '-');
const runtimeUrl = `https://${nsSlug}.adobeioruntime.net/api/v1/web/default/${actionName}`;

console.log('\n✅  Deployed successfully!');
console.log(`\n   Runtime URL:\n   ${runtimeUrl}`);
console.log('\n   Update RUNTIME_URL in tools/workfront/workfront.js with this URL.');
