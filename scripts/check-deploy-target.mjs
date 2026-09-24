#!/usr/bin/env node
/**
 * Firebase Hosting predeploy guard.
 *
 * Usage: node scripts/check-deploy-target.mjs <production|staging>
 *
 * Fails the deploy when the built site in `out/` does not point at the API for
 * the hosting target being deployed. A production deploy must reference the
 * production API and never the staging API. A staging deploy must reference
 * the staging API (every build also contains the production URL, which the
 * site forces on production hostnames, so it is not treated as an error).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const API_URLS = {
  production: 'reetle-api-production-507485624349.us-central1.run.app',
  staging: 'reetle-api-staging-507485624349.us-central1.run.app',
};

const target = process.argv[2];
if (!API_URLS[target]) {
  console.error(`check-deploy-target: unknown target "${target}" (expected production or staging)`);
  process.exit(1);
}
const forbiddenTarget = target === 'production' ? 'staging' : null;

const outDir = resolve(process.env.PROJECT_DIR || process.cwd(), 'out');

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(html|js|txt|json)$/.test(name)) yield path;
  }
}

let expectedFound = false;
const forbiddenIn = [];
try {
  for (const path of files(outDir)) {
    const text = readFileSync(path, 'utf8');
    if (text.includes(API_URLS[target])) expectedFound = true;
    if (forbiddenTarget && text.includes(API_URLS[forbiddenTarget])) forbiddenIn.push(path);
  }
} catch (err) {
  console.error(`check-deploy-target: cannot read ${outDir} (${err.message}). Build first.`);
  process.exit(1);
}

if (forbiddenIn.length > 0) {
  console.error(
    `\nSTOP: this build points at the ${forbiddenTarget} API but you are deploying to ${target}.\n` +
      `Found ${API_URLS[forbiddenTarget]} in:\n  ${forbiddenIn.slice(0, 5).join('\n  ')}\n` +
      `Rebuild with: npm run deploy:${target}\n`,
  );
  process.exit(1);
}
if (!expectedFound) {
  console.error(
    `\nSTOP: this build does not reference the ${target} API (${API_URLS[target]}).\n` +
      `Rebuild with: npm run deploy:${target}\n`,
  );
  process.exit(1);
}
console.log(`check-deploy-target: build points at the ${target} API. OK to deploy.`);
