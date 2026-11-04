#!/usr/bin/env node
// P5-02 demo seed: upserts the fictional dataset from fixtures/demo-dataset.mjs into Supabase.
//
// Safety rules (docs/SETUP.md, docs/DEMO.md):
//   - Upserts only rows whose IDs come from the fixed demo UUID namespace. Never deletes.
//   - Verifies the three prepared accounts exist in Supabase Auth before writing.
//   - Aborts if any demo project ID already exists with a different owner, or any demo
//     child row belongs to a project outside the demo set.
//   - The service-role/secret key is for this local process only. Never commit it.
//
// Usage (Node >= 22.18):
//   node scripts/seed-demo.mjs --dry-run            # validate + print plan, no network, no env needed
//   node scripts/seed-demo.mjs --apply              # write to Supabase (env below required)
//   node scripts/seed-demo.mjs --apply --skip-profiles
//
// Env for --apply: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   DEMO_FOUNDER_ID, DEMO_CONTRIBUTOR_ID, DEMO_UNRELATED_ID (Supabase Auth user UUIDs),
//   optional DEMO_FOUNDER_NAME, DEMO_CONTRIBUTOR_NAME, DEMO_UNRELATED_NAME.
import { pathToFileURL } from 'node:url';
import { buildDemoDataset, validateDataset } from '../fixtures/demo-dataset.mjs';

export const TABLE_ORDER = ['profiles', 'projects', 'project_needs', 'project_posts', 'milestones'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLACEHOLDER = {
  founder: '00000000-0000-4000-8000-00000000f001',
  contributor: '00000000-0000-4000-8000-00000000c001',
  unrelated: '00000000-0000-4000-8000-00000000a001',
};

export function parseArgs(argv) {
  const opts = { apply: false, dryRun: false, skipProfiles: false, help: false };
  for (const a of argv) {
    if (a === '--apply') opts.apply = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--skip-profiles') opts.skipProfiles = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (opts.apply && opts.dryRun) throw new Error('Choose either --apply or --dry-run.');
  if (!opts.apply) opts.dryRun = true; // safe default
  return opts;
}

export function accountsFromEnv(env, { requireReal }) {
  const read = (role, idVar, nameVar, defaultName) => {
    const id = env[idVar]?.trim() || (requireReal ? '' : PLACEHOLDER[role]);
    if (!UUID.test(id)) throw new Error(`${idVar} must be the Supabase Auth user UUID of the prepared ${role} account.`);
    return { id: id.toLowerCase(), displayName: env[nameVar]?.trim() || defaultName };
  };
  const accounts = {
    founder: read('founder', 'DEMO_FOUNDER_ID', 'DEMO_FOUNDER_NAME', 'Demo Founder'),
    contributor: read('contributor', 'DEMO_CONTRIBUTOR_ID', 'DEMO_CONTRIBUTOR_NAME', 'Demo Contributor'),
    unrelated: read('unrelated', 'DEMO_UNRELATED_ID', 'DEMO_UNRELATED_NAME', 'Demo Unrelated'),
  };
  if (new Set(Object.values(accounts).map((a) => a.id)).size !== 3) {
    throw new Error('Founder, contributor and unrelated accounts must be three different users.');
  }
  return accounts;
}

/** Thin Supabase REST/Auth client using fetch only (no dependency). */
export function supabaseRest({ url, key, fetchImpl = fetch }) {
  const base = url.replace(/\/$/, '');
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys use apikey only.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;

  const call = async (method, path, body, extra = {}) => {
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers: { ...headers, ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      // Report status and PostgREST's message, never the key.
      let detail = text.slice(0, 300);
      try {
        const j = JSON.parse(text);
        detail = [j.code, j.message ?? j.msg, j.hint].filter(Boolean).join(' – ');
      } catch {
        /* keep raw snippet */
      }
      throw new Error(`${method} ${path.split('?')[0]} failed: HTTP ${res.status} ${detail}`);
    }
    return text ? JSON.parse(text) : null;
  };

  return {
    getUser: (id) => call('GET', `/auth/v1/admin/users/${id}`),
    select: (table, ids, columns) => call('GET', `/rest/v1/${table}?select=${columns}&id=in.(${ids.join(',')})`),
    upsert: (table, rows) =>
      call('POST', `/rest/v1/${table}?on_conflict=id`, rows, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
  };
}

/** Checks no demo ID is already used by data outside the demo set. Returns problems. */
export async function checkOwnership(db, rows, founderId) {
  const problems = [];
  const projectIds = rows.projects.map((p) => p.id);
  const demoProjects = new Set(projectIds);
  for (const existing of (await db.select('projects', projectIds, 'id,owner_id')) ?? []) {
    if (existing.owner_id !== founderId) problems.push(`projects:${existing.id} exists with a different owner`);
  }
  for (const table of ['project_needs', 'project_posts', 'milestones']) {
    const ids = rows[table].map((r) => r.id);
    if (!ids.length) continue;
    for (const existing of (await db.select(table, ids, 'id,project_id')) ?? []) {
      if (!demoProjects.has(existing.project_id)) problems.push(`${table}:${existing.id} belongs to a non-demo project`);
    }
  }
  return problems;
}

export async function seed({ db, rows, accounts, skipProfiles, log = console.log }) {
  for (const [role, acct] of Object.entries(accounts)) {
    const user = await db.getUser(acct.id).catch((err) => {
      throw new Error(`Prepared ${role} account ${acct.id} not found in Supabase Auth (${err.message}).`);
    });
    if (!user?.email_confirmed_at && !user?.confirmed_at) log(`warning: ${role} account email is not confirmed`);
  }
  const problems = await checkOwnership(db, rows, accounts.founder.id);
  if (problems.length) throw new Error(`Refusing to seed:\n  ${problems.join('\n  ')}`);

  for (const table of TABLE_ORDER) {
    if (table === 'profiles' && skipProfiles) continue;
    if (!rows[table].length) continue;
    await db.upsert(table, rows[table]);
    log(`upserted ${rows[table].length} ${table}`);
  }
}

function summary(rows) {
  return TABLE_ORDER.map((t) => `  ${t.padEnd(14)} ${rows[t].length}`).join('\n');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log('Usage: node scripts/seed-demo.mjs [--dry-run | --apply [--skip-profiles]]');
    return;
  }
  const accounts = accountsFromEnv(process.env, { requireReal: opts.apply });
  const rows = buildDemoDataset(accounts);
  const problems = validateDataset(rows);
  if (problems.length) throw new Error(`Dataset fails the contract:\n  ${problems.join('\n  ')}`);

  console.log(`Fictional demo dataset is valid:\n${summary(rows)}`);
  console.log(`Projects: ${rows.projects.map((p) => p.title).join(', ')}`);

  if (opts.dryRun) {
    console.log('\nDry run: nothing written. Use --apply with the documented env to seed Supabase.');
    return;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply.');
  await seed({ db: supabaseRest({ url, key }), rows, accounts, skipProfiles: opts.skipProfiles });
  console.log('Seed complete. Rerunning is safe: it updates the same demo rows.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(`seed-demo: ${err.message}`);
    process.exit(1);
  });
}
