import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Real PostgreSQL semantics in an ephemeral WASM engine. This simulates Supabase's
// auth schema/roles; hosted Auth and PostgREST still need separate acceptance checks.
test('P0 database: owner → publication → application → private review', async t => {
  const db = new PGlite()
  const owner = '00000000-0000-4000-8000-000000000001'
  const applicant = '00000000-0000-4000-8000-000000000002'
  const unrelated = '00000000-0000-4000-8000-000000000003'
  const project = '10000000-0000-4000-8000-000000000001'
  const draft = '10000000-0000-4000-8000-000000000002'
  const need = '20000000-0000-4000-8000-000000000001'
  const closed = '20000000-0000-4000-8000-000000000002'
  const application = '30000000-0000-4000-8000-000000000001'
  const withdrawn = '30000000-0000-4000-8000-000000000002'
  async function as<T>(role: 'anon' | 'authenticated', userId: string | null, run: () => Promise<T>) {
    await db.exec(`set role ${role}`)
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ''])
    try { return await run() } finally { await db.exec('reset role') }
  }
  async function count(table: string) { return (await db.query<{ count: number }>(`select count(*)::int as count from public.${table}`)).rows[0].count }
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `)
    for (const migration of ['202611040001_p0_foundation.sql', '202611040002_discovery.sql', '202611040003_seed_record_guards.sql']) {
      await db.exec(await readFile(new URL(`../../../supabase/migrations/${migration}`, import.meta.url), 'utf8'))
    }
    for (const userId of [owner, applicant, unrelated]) {
      await db.query('insert into auth.users(id) values ($1)', [userId])
      await as('authenticated', userId, () => db.query('insert into public.profiles(id, display_name, bio, declared_skills, hours_per_week) values ($1, $2, $3, $4, 8)', [userId, userId === owner ? 'Founder' : 'Contributor', 'Private biography', ['React', 'TypeScript']]))
    }
    await t.test('private profiles are self-only; identity is immutable', async () => {
      await as('authenticated', owner, async () => {
        assert.equal(await count('profiles'), 1)
        await assert.rejects(db.query('update public.profiles set id=$1 where id=$2', [unrelated, owner]))
      })
      await as('anon', null, async () => { await assert.rejects(db.query('select * from public.profiles')) })
    })
    await t.test('projects start private and publication requires all fields', async () => {
      await as('authenticated', owner, async () => {
        await db.query('insert into public.projects(id) values ($1), ($2)', [project, draft])
        await assert.rejects(db.query("update public.projects set visibility='public' where id=$1", [project]))
        await db.query("update public.projects set title='River Sensor', pitch='Measure river conditions', problem='Floods', solution='Open sensors', sector='Climate', location='Newcastle', visibility='public' where id=$1", [project])
        const row = (await db.query<{ owner_display_name: string }>('select owner_display_name from public.projects where id=$1', [project])).rows[0]
        assert.equal(row.owner_display_name, 'Founder')
        await assert.rejects(db.query('update public.projects set owner_id=$1 where id=$2', [applicant, project]))
      })
      await as('anon', null, async () => { assert.equal(await count('projects'), 1) })
      await as('authenticated', unrelated, async () => {
        const result = await db.query('update public.projects set title=$1 where id=$2 returning id', ['Changed', project])
        assert.equal(result.rows.length, 0)
      })
    })
    await t.test('activity inherits visibility and only the owner writes', async () => {
      await as('authenticated', owner, async () => {
        await db.query("insert into public.project_posts(project_id, type, body) values ($1,'progress','First sensor'), ($2,'roadblock','Private blocker')", [project, draft])
        await db.query("insert into public.milestones(project_id,title,description,achieved_at) values ($1,'Prototype','Working sensor', now())", [project])
        await assert.rejects(db.query("insert into public.milestones(project_id,title,description,achieved_at,verification) values ($1,'Claim','Invalid',now(),'verified')", [project]))
      })
      await as('anon', null, async () => { assert.equal(await count('project_posts'), 1); assert.equal(await count('milestones'), 1) })
      await as('authenticated', unrelated, async () => {
        await assert.rejects(db.query("insert into public.project_posts(project_id,type,body) values ($1,'progress','Not the owner')", [project]))
        await assert.rejects(db.query("insert into public.milestones(project_id,title,description,achieved_at) values ($1,'No','No',now())", [project]))
      })
    })
    await t.test('needs require an owner and discovery filters combine with AND', async () => {
      await as('authenticated', owner, async () => {
        for (const [needId, state] of [[need, 'open'], [closed, 'closed']]) {
          await db.query(`insert into public.project_needs(id,project_id,title,description,required_skills,participation_type,hours_per_week,work_mode,location,status)
            values ($1,$2,'Developer','Build dashboard',array['React'],'contributor',5,'hybrid','Newcastle',$3)`, [needId, project, state])
        }
        await assert.rejects(db.query('update public.project_needs set project_id=$1 where id=$2', [draft, need]))
      })
      await as('anon', null, async () => {
        const results = await db.query<{ required_skills: string[]; open_needs_count: number; last_substantive_update_at: unknown }>("select * from public.discover_projects('river','newcastle','react','climate','idea')")
        assert.equal(results.rows.length, 1)
        assert.deepEqual(results.rows[0].required_skills, ['React'])
        assert.equal(Number(results.rows[0].open_needs_count), 1)
        assert.ok(results.rows[0].last_substantive_update_at)
        assert.equal((await db.query("select * from public.discover_projects(null,'Durham','React')")).rows.length, 0)
      })
      await as('authenticated', unrelated, async () => {
        assert.equal((await db.query("update public.project_needs set status='closed' where id=$1 returning id", [need])).rows.length, 0)
      })
    })
    await t.test('applications reject owner, closed needs, spoofing, and duplicates', async () => {
      await as('authenticated', owner, async () => { await assert.rejects(db.query("insert into public.applications(need_id,message) values ($1,'My own role')", [need])) })
      await as('authenticated', applicant, async () => {
        await assert.rejects(db.query("insert into public.applications(need_id,message) values ($1,'Closed')", [closed]))
        await assert.rejects(db.query("insert into public.applications(need_id,applicant_id,message) values ($1,$2,'Spoofed')", [need, unrelated]))
        await db.query("insert into public.applications(id,need_id,message) values ($1,$2,'I can help with React')", [application, need])
        await assert.rejects(db.query("insert into public.applications(need_id,message) values ($1,'Duplicate')", [need]))
        assert.equal(await count('applications'), 1)
      })
      await as('authenticated', unrelated, async () => {
        assert.equal(await count('applications'), 0)
        await assert.rejects(db.query('select public.application_review_summary($1)', [application]))
      })
      await as('anon', null, async () => {
        await assert.rejects(db.query('select * from public.applications'))
        await assert.rejects(db.query('select public.application_review_summary($1)', [application]))
      })
    })
    await t.test('founder sees only an allowlisted applicant summary', async () => {
      await as('authenticated', owner, async () => {
        assert.equal(await count('applications'), 1)
        assert.equal(await count('profiles'), 1)
        const result = await db.query<{ summary: Record<string, unknown> }>('select public.application_review_summary($1) as summary', [application])
        assert.deepEqual(Object.keys(result.rows[0].summary).sort(), ['declaredSkills', 'displayName', 'hoursPerWeek'])
        await db.query("update public.applications set status='reviewing' where id=$1", [application])
      })
      await as('authenticated', applicant, async () => {
        await assert.rejects(db.query("update public.applications set status='accepted' where id=$1", [application]))
        await assert.rejects(db.query('update public.applications set need_id=$1 where id=$2', [closed, application]))
      })
      await as('authenticated', owner, async () => {
        await db.query("update public.applications set status='accepted' where id=$1", [application])
        await assert.rejects(db.query("update public.applications set status='reviewing' where id=$1", [application]))
      })
      await as('authenticated', applicant, async () => {
        await assert.rejects(db.query("update public.applications set status='withdrawn' where id=$1", [application]))
        assert.equal((await db.query('update public.projects set title=$1 where id=$2 returning id', ['Accepted user still not owner', project])).rows.length, 0)
      })
    })
    await t.test('withdrawal remains private after a project returns to draft', async () => {
      await as('authenticated', unrelated, () => db.query("insert into public.applications(id,need_id,message) values ($1,$2,'Second applicant')", [withdrawn, need]))
      await as('authenticated', owner, () => db.query("update public.projects set visibility='draft' where id=$1", [project]))
      await as('anon', null, async () => { assert.equal(await count('project_posts'), 0); assert.equal(await count('project_needs'), 0) })
      await as('authenticated', unrelated, async () => {
        await db.query("update public.applications set status='withdrawn' where id=$1", [withdrawn])
        await assert.rejects(db.query("update public.applications set status='submitted' where id=$1", [withdrawn]))
      })
    })
  } finally { await db.close() }
})
