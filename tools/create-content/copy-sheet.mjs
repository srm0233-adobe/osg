#!/usr/bin/env node
/**
 * Copies a DA sheet (e.g. .da/adobe-target) from this template repo to a new
 * repo created from it, so integration credentials don't have to be re-entered.
 *
 * Usage:
 *   DA_TOKEN=eyJ... \
 *   SOURCE_ORG=ynaka-adobe SOURCE_REPO=da-demo-kit \
 *   DEST_ORG=my-org DEST_REPO=my-repo \
 *   SHEET_PATH=.da/adobe-target \
 *   node tools/create-content/copy-sheet.mjs
 *
 * DA_TOKEN: grab from DevTools on da.live (Authorization: Bearer ... request header).
 * Needs read access on SOURCE_ORG/SOURCE_REPO and write access on DEST_ORG/DEST_REPO.
 */

const {
  DA_TOKEN,
  SOURCE_ORG,
  SOURCE_REPO,
  DEST_ORG,
  DEST_REPO,
  SHEET_PATH = '.da/adobe-target',
} = process.env;

if (!DA_TOKEN || !SOURCE_ORG || !SOURCE_REPO || !DEST_ORG || !DEST_REPO) {
  console.error('Missing required env vars.');
  console.error('Usage: DA_TOKEN=<token> SOURCE_ORG=<org> SOURCE_REPO=<repo> DEST_ORG=<org> DEST_REPO=<repo> [SHEET_PATH=.da/adobe-target] node tools/create-content/copy-sheet.mjs');
  process.exit(1);
}

const sourceUrl = `https://content.da.live/${SOURCE_ORG}/${SOURCE_REPO}/${SHEET_PATH}.json`;
const destUrl = `https://content.da.live/${DEST_ORG}/${DEST_REPO}/${SHEET_PATH}`;

console.log(`Reading sheet from ${sourceUrl}`);
const getResp = await fetch(sourceUrl, {
  headers: { Authorization: `Bearer ${DA_TOKEN}` },
});
if (!getResp.ok) {
  console.error(`Failed to read source sheet: ${getResp.status} ${getResp.statusText}`);
  process.exit(1);
}
const sheetJson = await getResp.text();

console.log(`Writing sheet to ${destUrl}`);
const form = new FormData();
form.append('data', new Blob([sheetJson], { type: 'application/json' }), 'data.json');
const postResp = await fetch(destUrl, {
  method: 'POST',
  headers: { Authorization: `Bearer ${DA_TOKEN}` },
  body: form,
});
if (!postResp.ok) {
  const text = await postResp.text().catch(() => postResp.status);
  console.error(`Failed to write destination sheet: ${postResp.status} — ${text}`);
  process.exit(1);
}

console.log(`Copied ${SHEET_PATH} from ${SOURCE_ORG}/${SOURCE_REPO} to ${DEST_ORG}/${DEST_REPO}.`);
