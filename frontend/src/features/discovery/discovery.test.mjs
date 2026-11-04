// Run: node --test frontend/src/features/discovery/discovery.test.mjs  (Node >= 22.18; imports .ts via type stripping)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filtersFromParams, formatUpdate, hasActiveFilters, toQueryString } from './filters.ts';
import { legacyToSummary, queryFixtureSummaries } from './fixtureSource.ts';
import { projects } from '../../data/mockData.ts';

test('URL params round-trip and drop blank/unknown values', () => {
  const f = filtersFromParams(new URLSearchParams('q=%20flood%20&location=Durham&stage=MVP&skill=&foo=bar&sector=Climate'));
  assert.deepEqual(f, { q: 'flood', location: 'Durham', sector: 'Climate', stage: 'mvp' });
  assert.equal(toQueryString(f), 'q=flood&location=Durham&sector=Climate&stage=mvp');
  assert.deepEqual(filtersFromParams(new URLSearchParams('stage=unicorn')), {});
  assert.equal(toQueryString({ skill: 'React', limit: 12, offset: 0 }), 'skill=React&limit=12');
  assert.equal(toQueryString({ limit: 12, offset: 24 }), 'limit=12&offset=24');
  assert.equal(hasActiveFilters({}), false);
  assert.equal(hasActiveFilters({ skill: 'React' }), true);
});

test('update label never implies dormancy for projects without history', () => {
  assert.equal(formatUpdate(null), 'No progress update yet');
  assert.match(formatUpdate('2026-10-20T00:00:00.000Z'), /^Last progress 20 Oct 2026$/);
});

const summaries = projects.map(legacyToSummary);

test('legacy fixture maps to contract ProjectSummary', () => {
  const qw = summaries.find((s) => s.id === 'quaywatch');
  assert.ok(qw);
  assert.equal(qw.stage, 'mvp');
  assert.equal(qw.status, 'active');
  assert.equal(qw.ownerDisplayName, 'Priya Natarajan');
  assert.deepEqual(qw.requiredSkills, ['React', 'TypeScript', 'Python', 'FastAPI']);
  assert.equal(qw.openNeedsCount, 2);
  for (const s of summaries) {
    assert.ok(['idea', 'prototype', 'mvp', 'launched'].includes(s.stage), s.id);
    assert.ok(['active', 'paused', 'completed'].includes(s.status), s.id);
  }
});

test('fixture query applies contract semantics', () => {
  const all = queryFixtureSummaries(summaries, {});
  assert.equal(all.pagination.total, summaries.length);
  const created = all.data.map((s) => Date.parse(s.createdAt));
  assert.deepEqual(created, [...created].sort((a, b) => b - a), 'newest first');

  const react = queryFixtureSummaries(summaries, { skill: 'react' }).data;
  assert.ok(react.length > 0 && react.every((s) => s.requiredSkills.some((k) => k.toLowerCase() === 'react')));

  const durham = queryFixtureSummaries(summaries, { location: 'DURHAM' }).data;
  assert.ok(durham.length > 0 && durham.every((s) => s.location === 'Durham'));

  assert.equal(queryFixtureSummaries(summaries, { skill: 'COBOL' }).pagination.total, 0);
  const paged = queryFixtureSummaries(summaries, { limit: 2, offset: 1 });
  assert.equal(paged.data.length, 2);
  assert.deepEqual(paged.data, all.data.slice(1, 3));
});

test('sector suggestions match word prefixes, whole-name prefixes first', async () => {
  const { SECTORS, suggestSectors, canonicalSector } = await import('./sectors.ts');
  assert.deepEqual(suggestSectors('fi'), ['Film & TV', 'Finance', 'FinTech', 'Sport & Fitness']);
  assert.deepEqual(suggestSectors('FIN'), ['Finance', 'FinTech']);
  assert.deepEqual(suggestSectors('machine'), ['Machine Learning']);
  assert.deepEqual(suggestSectors('soft'), ['Software Development', 'Software Engineering']);
  assert.deepEqual(suggestSectors('ai'), ['AI Development']);
  assert.deepEqual(suggestSectors('dev'), ['Developer Tools', 'AI Development', 'Cloud & DevOps', 'Software Development', 'Web Development']);
  assert.deepEqual(suggestSectors('learn'), ['Machine Learning']);
  assert.equal(canonicalSector('fintech'), 'FinTech', 'old spelling still matches');
  assert.deepEqual(suggestSectors('data an'), ['Data & Analytics']);
  assert.deepEqual(suggestSectors('zzz'), []);
  assert.equal(suggestSectors('').length, SECTORS.length);
  assert.equal(suggestSectors('', 5).length, 5);
  assert.equal(canonicalSector('  fintech '), 'FinTech');
  assert.equal(canonicalSector('Fin'), null);
  assert.equal(new Set(SECTORS.map((s) => s.toLowerCase())).size, SECTORS.length, 'no duplicates');
  assert.ok(SECTORS.every((s) => s.length <= 120));
});

test('frontend and backend sector lists are identical', async () => {
  const fe = await import('./sectors.ts');
  const be = await import('../../../../backend/src/features/discovery/sectors.ts');
  assert.deepEqual([...fe.SECTORS], [...be.SECTORS]);
});

test('skills: aliases map to one canonical name; unknown skills are kept', async () => {
  const { SKILLS, SKILL_ALIASES, canonicalSkill, canonicalSkills, suggestSkills } = await import('./skills.ts');
  for (const [raw, want] of [['reactjs', 'React'], ['React.js', 'React'], [' REACT ', 'React'], ['postgres', 'PostgreSQL'],
    ['ts', 'TypeScript'], ['ai', 'AI/ML'], ['ML', 'AI/ML'], ['ai/ml', 'AI/ML'], ['nodejs', 'Node.js'], ['k8s', 'Kubernetes'],
    ['Tailwind', 'Tailwind CSS'], ['UX research', 'User Research'], ['Data visualization', 'Data Visualisation']]) {
    assert.equal(canonicalSkill(raw), want, raw);
  }
  assert.equal(canonicalSkill('  Quantum   Basket Weaving '), 'Quantum Basket Weaving', 'unknown skill kept, whitespace tidied');
  assert.deepEqual(canonicalSkills(['react', 'React', 'ReactJS', 'postgres', 'Leaflet', '']), ['React', 'PostgreSQL', 'Leaflet']);
  assert.equal(new Set(SKILLS.map((s) => s.toLowerCase())).size, SKILLS.length, 'no duplicate skills');
  for (const target of Object.values(SKILL_ALIASES)) assert.ok(SKILLS.includes(target), `alias target ${target} is listed`);
  assert.ok(SKILLS.every((s) => s.length <= 60), 'contract: each skill <= 60 chars');
  assert.deepEqual(suggestSkills('post').slice(0, 1), ['PostgreSQL']);
  assert.ok(suggestSkills('react').slice(0, 2).includes('React'));
  assert.ok(suggestSkills('reactj').includes('React'), 'alias prefix suggests canonical');
  assert.ok(suggestSkills('ai').includes('AI/ML'));
  assert.ok(suggestSkills('type').includes('TypeScript'));
  assert.ok(!suggestSkills('re', 8, ['React']).includes('React'), 'already-entered skills are excluded');
});

test('frontend and backend skill lists are identical', async () => {
  const fe = await import('./skills.ts');
  const be = await import('../../../../backend/src/features/discovery/skills.ts');
  assert.deepEqual([...fe.SKILLS], [...be.SKILLS]);
  assert.deepEqual(fe.SKILL_ALIASES, be.SKILL_ALIASES);
});
