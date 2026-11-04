// Canonical fictional demo dataset (P5-02), as snake_case rows for the tables in
// docs/CONTRACTS.md. Built from:
//   1. the existing frontend fixture (frontend/src/data/mockData.ts), via a legacy adapter;
//   2. the preserved TyneFlow AI / Vanguard fixtures in ./legacy-projects.mjs.
//
// Every ID is a deterministic UUID derived from a fixed demo namespace, which is how
// demo records are "tagged": the seed only ever touches these IDs, so reruns update
// the same rows and never create duplicates.
//
// Requires Node >= 22.18 (imports the TypeScript fixture via type stripping).
import { createHash } from 'node:crypto';
import { projects as legacyFrontendProjects, demoContributor } from '../frontend/src/data/mockData.ts';
import { LEGACY_PROJECTS } from './legacy-projects.mjs';

/** Fixed namespace for all demo UUIDs. Never reuse it for real data. */
export const DEMO_NAMESPACE = '6e5f0a3c-9b1d-5c7e-8f24-0d3a1b2c4e5f';
export const FICTIONAL_NOTE = 'Fictional demo project for North East Origins. Not a real organisation; no traction is claimed.';
const DAY = 86_400_000;

/** RFC 4122 version-5 UUID (SHA-1, name-based). */
export function demoUuid(name) {
  const ns = Buffer.from(DEMO_NAMESPACE.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(ns).update(`neo-demo:${name}`).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const h = hash.subarray(0, 16).toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ---- Legacy frontend fixture -> canonical enums ----
const STAGE = { idea: 'idea', prototype: 'prototype', mvp: 'mvp', 'early users': 'launched', 'active beta': 'mvp' };
const WORK_TYPE = { cofounder: 'cofounder', 'ongoing contributor': 'contributor', 'short task': 'task', mentor: 'mentor' };
const WORK_MODE = { remote: 'remote', hybrid: 'hybrid', 'in person': 'local' };
const COMPENSATION = { paid: 'paid', voluntary: 'voluntary', 'equity discussion': 'equity_discussion', unspecified: 'unspecified' };
const POST_TYPE = { 'progress update': 'progress', milestone: 'milestone', roadblock: 'roadblock', opportunity: 'opportunity', announcement: 'announcement' };

function mapEnum(table, value, label) {
  const mapped = table[String(value).toLowerCase()];
  if (!mapped) throw new Error(`Legacy fixture: unknown ${label} "${value}"`);
  return mapped;
}

/** Adapts one legacy frontend fixture project to the canonical intermediate shape. */
export function adaptFrontendProject(p, now) {
  const ago = (iso) => Math.max(0, Math.round((now - Date.parse(iso)) / DAY));
  return {
    key: `frontend:${p.slug}`,
    title: p.title,
    pitch: p.tagline,
    problem: p.problem,
    solution: p.solution,
    sector: p.sector,
    location: p.location,
    stage: mapEnum(STAGE, p.stage, 'stage'),
    status: mapEnum({ active: 'active', paused: 'paused', completed: 'completed' }, p.status, 'status'),
    createdDaysAgo: ago(p.createdAt),
    needs: p.needs.map((n) => ({
      key: n.id,
      title: n.title,
      description: n.description,
      requiredSkills: n.requiredSkills,
      desirableSkills: n.desirableSkills,
      participationType: mapEnum(WORK_TYPE, n.workType, 'work type'),
      hoursPerWeek: n.hoursPerWeek,
      workMode: mapEnum(WORK_MODE, n.workMode, 'work mode'),
      compensation: mapEnum(COMPENSATION, n.compensation, 'compensation'),
      status: mapEnum({ open: 'open', reviewing: 'reviewing', filled: 'filled', closed: 'closed' }, n.status, 'need status'),
      createdDaysAgo: ago(p.createdAt),
    })),
    posts: p.posts.map((post) => ({ key: post.id, type: mapEnum(POST_TYPE, post.type, 'post type'), daysAgo: ago(post.date), body: post.body })),
    // Legacy `verified` flags are deliberately dropped: every milestone is self-reported.
    milestones: p.milestones.map((m) => ({
      key: m.id,
      title: m.title,
      description: 'Founder-reported milestone.',
      daysAgo: ago(m.date),
      evidenceUrl: m.evidenceUrl ?? null,
    })),
  };
}

/**
 * Builds all rows. `founder`, `contributor`, `unrelated` are `{ id, displayName }` for the
 * prepared, confirmed Supabase Auth accounts. `now` (ms) fixes relative dates for tests.
 */
export function buildDemoDataset({ founder, contributor, unrelated, now = Date.now() }) {
  const iso = (daysAgo) => new Date(now - daysAgo * DAY).toISOString();
  const sources = [...legacyFrontendProjects.map((p) => adaptFrontendProject(p, now)), ...LEGACY_PROJECTS];

  const rows = { profiles: [], projects: [], project_needs: [], project_posts: [], milestones: [] };

  rows.profiles.push(
    {
      id: founder.id, display_name: founder.displayName, bio: 'Fictional demo founder account.',
      location: 'Newcastle', declared_skills: ['Product', 'Hardware'], interests: ['Climate', 'Community'],
      hours_per_week: 20, participation_types: ['cofounder'], work_modes: ['hybrid'],
    },
    {
      id: contributor.id, display_name: contributor.displayName, bio: 'Fictional demo contributor account.',
      location: demoContributor.location, declared_skills: ['React', 'TypeScript'], interests: demoContributor.interests,
      hours_per_week: demoContributor.hoursPerWeek, participation_types: ['contributor', 'task'], work_modes: ['remote', 'hybrid'],
    },
    {
      id: unrelated.id, display_name: unrelated.displayName, bio: 'Fictional demo account used for permission checks.',
      location: 'Sunderland', declared_skills: [], interests: [], hours_per_week: null, participation_types: [], work_modes: [],
    },
  );

  for (const src of sources) {
    const projectId = demoUuid(`project:${src.key}`);
    const createdAt = iso(src.createdDaysAgo);
    rows.projects.push({
      id: projectId,
      owner_id: founder.id,
      owner_display_name: founder.displayName,
      title: src.title,
      pitch: src.pitch,
      problem: `${src.problem}\n\n${FICTIONAL_NOTE}`,
      solution: src.solution,
      sector: src.sector,
      location: src.location,
      stage: src.stage,
      status: src.status,
      visibility: 'public',
      created_at: createdAt,
      updated_at: new Date(now).toISOString(),
    });
    for (const n of src.needs) {
      rows.project_needs.push({
        id: demoUuid(`need:${src.key}:${n.key}`),
        project_id: projectId,
        title: n.title,
        description: n.description,
        required_skills: n.requiredSkills,
        desirable_skills: n.desirableSkills,
        participation_type: n.participationType,
        hours_per_week: n.hoursPerWeek,
        work_mode: n.workMode,
        location: src.location,
        compensation: n.compensation,
        status: n.status,
        created_at: iso(Math.min(n.createdDaysAgo, src.createdDaysAgo)),
      });
    }
    for (const post of src.posts) {
      rows.project_posts.push({
        id: demoUuid(`post:${src.key}:${post.key}`),
        project_id: projectId,
        author_id: founder.id,
        type: post.type,
        body: post.body,
        created_at: iso(post.daysAgo),
      });
    }
    for (const m of src.milestones) {
      rows.milestones.push({
        id: demoUuid(`milestone:${src.key}:${m.key}`),
        project_id: projectId,
        title: m.title,
        description: m.description,
        achieved_at: iso(m.daysAgo),
        evidence_url: m.evidenceUrl,
        verification: 'self_reported',
        created_at: iso(m.daysAgo),
      });
    }
  }
  return rows;
}

// ---- Contract validation (docs/CONTRACTS.md "Minimum validation") ----
const ENUMS = {
  stage: ['idea', 'prototype', 'mvp', 'launched'],
  status: ['active', 'paused', 'completed'],
  participation_type: ['cofounder', 'contributor', 'task', 'mentor'],
  work_mode: ['local', 'remote', 'hybrid'],
  compensation: ['paid', 'voluntary', 'equity_discussion', 'unspecified'],
  need_status: ['open', 'reviewing', 'filled', 'closed'],
  post_type: ['progress', 'milestone', 'roadblock', 'opportunity', 'announcement'],
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns a list of human-readable problems; empty means the dataset satisfies the contract. */
export function validateDataset(rows) {
  const problems = [];
  const where = (table, row) => `${table}:${row.id}`;
  const text = (table, row, field, max, required = true) => {
    const v = row[field];
    if (typeof v !== 'string' || v !== v.trim() || (required && !v) || v.length > max) {
      problems.push(`${where(table, row)} ${field} must be trimmed text${required ? ', non-empty' : ''}, ≤${max}`);
    }
  };
  const skills = (table, row, field) => {
    const v = row[field];
    const lower = Array.isArray(v) ? v.map((s) => String(s).toLowerCase()) : [];
    if (!Array.isArray(v) || v.length > 30 || new Set(lower).size !== v.length || v.some((s) => !s || s.length > 60)) {
      problems.push(`${where(table, row)} ${field} must be ≤30 unique skills of ≤60 chars`);
    }
  };
  const oneOf = (table, row, field, values) => {
    if (!values.includes(row[field])) problems.push(`${where(table, row)} ${field}="${row[field]}" is not a contract value`);
  };
  const ids = new Set();
  for (const [table, list] of Object.entries(rows)) {
    for (const row of list) {
      if (!UUID.test(row.id)) problems.push(`${where(table, row)} id is not a UUID`);
      if (ids.has(row.id)) problems.push(`${where(table, row)} duplicate id`);
      ids.add(row.id);
    }
  }
  const projectIds = new Set(rows.projects.map((p) => p.id));
  for (const p of rows.projects) {
    for (const f of ['title']) text('projects', p, f, 120);
    text('projects', p, 'pitch', 300);
    text('projects', p, 'problem', 5000);
    text('projects', p, 'solution', 5000);
    text('projects', p, 'sector', 120);
    text('projects', p, 'location', 120);
    text('projects', p, 'owner_display_name', 120);
    oneOf('projects', p, 'stage', ENUMS.stage);
    oneOf('projects', p, 'status', ENUMS.status);
    if (p.visibility !== 'public') problems.push(`${where('projects', p)} demo projects are published`);
    if (!p.problem.includes(FICTIONAL_NOTE)) problems.push(`${where('projects', p)} missing fictional label`);
  }
  for (const n of rows.project_needs) {
    if (!projectIds.has(n.project_id)) problems.push(`${where('project_needs', n)} orphaned`);
    text('project_needs', n, 'title', 120);
    text('project_needs', n, 'description', 5000);
    text('project_needs', n, 'location', 120);
    skills('project_needs', n, 'required_skills');
    skills('project_needs', n, 'desirable_skills');
    if (!n.required_skills.length) problems.push(`${where('project_needs', n)} needs at least one required skill`);
    if (!Number.isInteger(n.hours_per_week) || n.hours_per_week < 1 || n.hours_per_week > 80) problems.push(`${where('project_needs', n)} hours 1–80`);
    oneOf('project_needs', n, 'participation_type', ENUMS.participation_type);
    oneOf('project_needs', n, 'work_mode', ENUMS.work_mode);
    oneOf('project_needs', n, 'compensation', ENUMS.compensation);
    oneOf('project_needs', n, 'status', ENUMS.need_status);
  }
  for (const post of rows.project_posts) {
    if (!projectIds.has(post.project_id)) problems.push(`${where('project_posts', post)} orphaned`);
    text('project_posts', post, 'body', 5000);
    oneOf('project_posts', post, 'type', ENUMS.post_type);
  }
  for (const m of rows.milestones) {
    if (!projectIds.has(m.project_id)) problems.push(`${where('milestones', m)} orphaned`);
    text('milestones', m, 'title', 120);
    if (m.verification !== 'self_reported') problems.push(`${where('milestones', m)} must be self_reported`);
    if (m.evidence_url !== null && !/^https?:\/\//.test(m.evidence_url)) problems.push(`${where('milestones', m)} evidence_url must be http(s)`);
  }
  for (const pr of rows.profiles) {
    text('profiles', pr, 'display_name', 120);
    text('profiles', pr, 'bio', 5000, false);
    skills('profiles', pr, 'declared_skills');
    if (pr.hours_per_week !== null && (!Number.isInteger(pr.hours_per_week) || pr.hours_per_week < 1 || pr.hours_per_week > 80)) {
      problems.push(`${where('profiles', pr)} hours 1–80 or null`);
    }
  }
  if (!rows.project_needs.some((n) => n.status === 'open')) problems.push('dataset needs at least one open need');
  if (!rows.project_needs.some((n) => n.status === 'closed')) problems.push('dataset needs at least one closed need');
  return problems;
}
