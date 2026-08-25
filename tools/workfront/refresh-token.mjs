#!/usr/bin/env node
// Run: node tools/workfront/refresh-token.mjs
// Reads credentials from DA sheet .da/adobe-workfront, fetches an IMS token, writes to config.json

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dir = dirname(fileURLToPath(import.meta.url));
const configPath = join(dir, 'config.json');

// DA_TOKEN env var required to read the private .da/ sheet
// Get it from DevTools on da.live (Authorization: Bearer ... header)
const daToken = process.env.DA_TOKEN;
if (!daToken) {
  console.error('Set DA_TOKEN env var: DA_TOKEN=eyJ... node tools/workfront/refresh-token.mjs');
  process.exit(1);
}

const sheetResp = await fetch('https://content.da.live/ynaka-adobe/da-demo-kit/.da/adobe-workfront.json', {
  headers: { Authorization: `Bearer ${daToken}` },
});
if (!sheetResp.ok) {
  console.error(`Failed to read DA sheet: ${sheetResp.status} ${sheetResp.statusText}`);
  process.exit(1);
}
const { data } = await sheetResp.json();
const get = (key) => data.find((r) => r.key === key)?.value;

const clientId = get('clientId');
const clientSecret = get('clientSecret');
// Sheet stores either a full "domain" (e.g. foo.my.workfront.com) or a short
// "tenant" name (e.g. foo) that needs the standard suffix appended.
const tenant = get('tenant');
const domain = get('domain') || (tenant && !tenant.includes('.') ? `${tenant}.my.workfront.com` : tenant);

if (!clientId || !clientSecret || !domain) {
  console.error('Missing clientId, clientSecret, or domain/tenant in DA sheet .da/adobe-workfront');
  process.exit(1);
}

const tokenResp = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'openid,AdobeID,read_organizations,additional_info.projectedProductContext,workfront_api',
  }),
});

const tokenData = await tokenResp.json();
if (!tokenData.access_token) {
  console.error('IMS token error:', JSON.stringify(tokenData));
  process.exit(1);
}

const { access_token: accessToken, expires_in: expiresIn } = tokenData;
const expiresAt = Date.now() + expiresIn * 1000;

writeFileSync(configPath, JSON.stringify({ domain, clientId, accessToken, expiresAt }, null, 2));
console.log(`Token refreshed for domain "${domain}". Expires in ${Math.round(expiresIn / 3600)}h.`);
