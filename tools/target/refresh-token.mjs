#!/usr/bin/env node
// Run: node tools/target/refresh-token.mjs
// Reads credentials from DA sheet .da/adobe-target, fetches a token, writes to config.json

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dir = dirname(fileURLToPath(import.meta.url));
const configPath = join(dir, 'config.json');

// DA_TOKEN env var required to read the private .da/ sheet
// Get it from DevTools on da.live (Authorization: Bearer ... header)
const daToken = process.env.DA_TOKEN;
if (!daToken) {
  console.error('Set DA_TOKEN env var: DA_TOKEN=eyJ... node tools/tag-gen/refresh-token.mjs');
  process.exit(1);
}

const sheetResp = await fetch('https://content.da.live/ynaka-adobe/beckmancoulter/.da/adobe-target.json', {
  headers: { Authorization: `Bearer ${daToken}` },
});
const { data } = await sheetResp.json();
const get = (key) => data.find((r) => r.key === key)?.value;

const tenant = get('tenant');
const clientId = get('clientId');
const clientSecret = get('clientSecret');

if (!clientId || !clientSecret) {
  console.error('Missing credentials in DA sheet .da/adobe-target');
  process.exit(1);
}

const tokenResp = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'openid,AdobeID,read_organizations,additional_info.projectedProductContext,target_sdk',
  }),
});

const { access_token: accessToken, expires_in: expiresIn } = await tokenResp.json();
const expiresAt = Date.now() + expiresIn * 1000;

writeFileSync(configPath, JSON.stringify({ tenant, clientId, accessToken, expiresAt }, null, 2));
console.log(`Token refreshed for tenant "${tenant}". Expires in ${Math.round(expiresIn / 3600)}h.`);
