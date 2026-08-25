#!/usr/bin/env node
/**
 * Creates default DA content pages for a new demo project.
 *
 * Usage:
 *   ORG=my-org REPO=my-repo DA_TOKEN=eyJ... node tools/create-content/create-content.mjs
 *
 * DA_TOKEN: grab from DevTools on da.live (Authorization: Bearer ... request header)
 *
 * Templates live in tools/create-content/content/*.html
 * Each file maps to a DA page: nav.html → /{org}/{repo}/nav
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const DIR = dirname(fileURLToPath(import.meta.url));

const ORG = process.env.ORG;
const REPO = process.env.REPO;
const DA_TOKEN = process.env.DA_TOKEN;

if (!ORG || !REPO || !DA_TOKEN) {
  console.error('Missing required env vars.');
  console.error('Usage: ORG=<org> REPO=<repo> DA_TOKEN=<token> node tools/create-content/create-content.mjs');
  process.exit(1);
}

async function postPage(path, html) {
  const form = new FormData();
  form.append('data', new Blob([html], { type: 'text/html' }), 'data.html');
  const url = `https://content.da.live/${ORG}/${REPO}/${path}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${DA_TOKEN}` },
    body: form,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.status);
    throw new Error(`${resp.status} — ${text}`);
  }
}

const contentDir = join(DIR, 'content');
const files = readdirSync(contentDir)
  .filter((f) => extname(f) === '.html')
  .sort(); // nav, footer, index, then any extras

console.log(`\nCreating ${files.length} pages in ${ORG}/${REPO}...\n`);

let passed = 0;
let failed = 0;

for (const file of files) {
  const pagePath = basename(file, '.html');
  const html = readFileSync(join(contentDir, file), 'utf8');
  process.stdout.write(`  ${pagePath.padEnd(20)}`);
  try {
    await postPage(pagePath, html);
    console.log('✓');
    passed += 1;
  } catch (err) {
    console.log(`✗  ${err.message}`);
    failed += 1;
  }
}

console.log(`\n${passed} created${failed ? `, ${failed} failed` : ''}.\n`);
console.log(`Preview at: https://da.live/#/${ORG}/${REPO}`);
