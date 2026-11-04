// Run against an already built/running local app and local Supabase.
// node --env-file=.env.test tests/e2e/local-acceptance.mjs [suite filenames]
// NEO_API_URL and NEO_UI_URL select the app; every target must be localhost.
// Uses existing dependencies, isolated fictional accounts/seed IDs, and cleanup.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { buildDemoDataset, validateDataset } from '../../fixtures/demo-dataset.mjs';
import { seed, supabaseRest } from '../../scripts/seed-demo.mjs';

const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');
const root = fileURLToPath(new URL('../../', import.meta.url));
const suiteNames = ['p0.test.mjs', 'discovery.browser.test.mjs', 'permissions.api.test.mjs', 'forms.browser.test.mjs', 'rls.api.test.mjs', 'visual.browser.test.mjs'];
const selected = process.argv.slice(2).length ? process.argv.slice(2) : suiteNames;
assert.ok(selected.every(name => suiteNames.includes(name)), 'Choose named local acceptance suites only.');
for (const name of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  assert.ok(process.env[name], `${name} is required.`);
}
const apiUrl = process.env.NEO_API_URL ?? 'http://127.0.0.1:3001';
const uiUrl = process.env.NEO_UI_URL ?? 'http://127.0.0.1:5173';
const mailUrl = process.env.NEO_MAILPIT_URL ?? 'http://127.0.0.1:54324';
function requireLocal(target) {
  const parsed = new URL(target);
  assert.ok(['localhost', '127.0.0.1'].includes(parsed.hostname), 'Disposable acceptance runs require local targets.');
  assert.ok(['http:', 'https:'].includes(parsed.protocol), 'HTTP targets are required.');
  assert.ok(!parsed.username && !parsed.password, 'Target URLs must not contain credentials.');
}
for (const target of [process.env.SUPABASE_URL, apiUrl, uiUrl, mailUrl]) requireLocal(target);
function localFetch(input, init = {}) {
  requireLocal(typeof input === 'string' || input instanceof URL ? input : input.url);
  return fetch(input, { ...init, redirect: 'error', signal: init.signal ?? AbortSignal.timeout(15_000) });
}
const health = await localFetch(`${apiUrl}/api/health`);
assert.equal(health.status, 200, 'Start the local API before acceptance.');
const page = await localFetch(uiUrl, { headers: { Accept: 'text/html' } });
assert.equal(page.status, 200, 'Start the local UI before acceptance.');
assert.match(await page.text(), /<title>North East Origins<\/title>/);

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: localFetch },
});
const run = randomUUID().slice(0, 8);
const password = `Neo-acceptance-${randomUUID()}!`;
const prepared = {};
const created = [];
const results = [];
let cleanupPassed = false;
let interruptedChild = false;
try {
  for (const role of ['founder', 'contributor', 'unrelated']) {
    const email = `neo-acceptance-${role}-${run}@example.test`;
    const response = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.ifError(response.error);
    created.push(response.data.user.id);
    prepared[role] = { id: response.data.user.id, displayName: `Fictional ${role}`, email };
  }
  const rows = buildDemoDataset({ ...prepared, idScope: `acceptance-${run}` });
  assert.deepEqual(validateDataset(rows), []);
  await seed({ db: supabaseRest({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl: localFetch }), rows, accounts: prepared, skipProfiles: false, log: () => {} });
  console.log('Prepared 3 isolated fictional accounts and 8 local projects.');
  const childEnv = {
    ...process.env,
    NEO_API_URL: apiUrl, NEO_UI_URL: uiUrl, NEO_MAILPIT_URL: mailUrl,
    E2E_BASE_URL: apiUrl, E2E_RUN_ID: run,
    E2E_SIGNUP_EMAIL: `neo-acceptance-signup-${run}@example.test`,
    NODE_PATH: fileURLToPath(new URL('../../backend/node_modules/', import.meta.url)),
  };
  for (const [role, account] of Object.entries(prepared)) {
    childEnv[`E2E_${role.toUpperCase()}_EMAIL`] = account.email;
    childEnv[`E2E_${role.toUpperCase()}_PASSWORD`] = password;
  }
  await mkdir(new URL('./test-results/', import.meta.url), { recursive: true });
  for (const name of selected) {
    console.log(`Running ${name}`);
    const env = { ...childEnv };
    if (!['p0.test.mjs', 'forms.browser.test.mjs'].includes(name)) delete env.SUPABASE_SERVICE_ROLE_KEY;
    const started = Date.now();
    const result = spawnSync(process.execPath, ['--test', '--test-reporter=spec', `tests/e2e/${name}`], {
      cwd: root, env, encoding: 'utf8', timeout: 180_000, maxBuffer: 8 * 1024 * 1024,
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    process.stdout.write(output);
    if (result.error) console.error(`Suite process failed: ${result.error.code ?? 'unknown'}`);
    if (result.error || result.signal) interruptedChild = true;
    await writeFile(new URL(`./test-results/${name}.log`, import.meta.url), output);
    const counts = Object.fromEntries([...stripVTControlCharacters(output).matchAll(/^ℹ (tests|pass|fail|cancelled|skipped) (\d+)\s*$/gm)]
      .map(([, label, count]) => [label, Number(count)]));
    const passed = result.status === 0 && counts.tests > 0 && counts.fail === 0 && counts.cancelled === 0 && counts.skipped === 0;
    results.push({ suite: name, exitCode: result.status, passed, ...counts, durationMs: Date.now() - started });
    if (!passed) process.exitCode = 1;
  }
} finally {
  const errors = [];
  if (interruptedChild) errors.push('A suite was interrupted; its separate disposable-account cleanup requires verification.');
  if (created.length) {
    const removed = await admin.from('projects').delete().in('owner_id', created);
    if (removed.error) errors.push('Could not remove isolated projects.');
    const remainingProjects = await admin.from('projects').select('id', { count: 'exact', head: true }).in('owner_id', created);
    if (remainingProjects.error || remainingProjects.count !== 0) errors.push('Project cleanup could not be verified.');
    for (const id of [...created].reverse()) {
      const removedUser = await admin.auth.admin.deleteUser(id);
      if (removedUser.error) errors.push('Could not remove an isolated account.');
    }
    for (const id of created) {
      const remaining = await admin.auth.admin.getUserById(id);
      if (remaining.data.user || !remaining.error || remaining.error.status !== 404) errors.push('Account cleanup could not be verified.');
    }
  }
  cleanupPassed = errors.length === 0;
  if (!cleanupPassed) {
    process.exitCode = 1;
    console.error(errors.join('\n'));
  } else console.log('Isolated projects and prepared accounts removed; account cleanup verified.');
  await mkdir(new URL('./test-results/', import.meta.url), { recursive: true });
  await writeFile(new URL('./test-results/local-acceptance.json', import.meta.url), JSON.stringify({
    run, completedAt: new Date().toISOString(),
    revision: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout?.trim(),
    targets: { api: apiUrl, ui: uiUrl, supabase: process.env.SUPABASE_URL },
    results, cleanupPassed,
  }, null, 2));
}
