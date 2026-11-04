import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  validatePolicy, ownerOf, changedPaths, checkChanges, findOverlaps,
  parseNameStatus, collectLocalChanges, githubPages, githubClient, collectGitHubChanges,
} from './check-ownership.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const policy = JSON.parse(readFileSync(new URL('../../coordination/ownership.json', import.meta.url), 'utf8'));
const freshPolicy = () => structuredClone(policy);
const change = filename => ({ filename, status: 'modified' });

test('real policy is valid and every currently tracked file is assigned', () => {
  validatePolicy(policy);
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const path of files) assert.ok(ownerOf(policy, path), `Unassigned tracked path: ${path}`);
});

test('each lane can change its own real feature area', () => {
  const paths = {
    p1: 'backend/src/middleware/auth.ts',
    p2: 'frontend/src/features/projects/ProjectPage.tsx',
    p3: 'backend/src/features/activity/routes.ts',
    p4: 'frontend/src/features/opportunities/NeedForm.tsx',
    p5: 'backend/src/features/discovery/search.ts',
  };
  for (const [lane, path] of Object.entries(paths)) {
    assert.deepEqual(checkChanges(policy, `${lane}/slice`, [change(path)]), { lane, violations: [] });
  }
});

test('feature lane cannot edit another feature or shared shell, schema, contracts, policy', () => {
  const paths = [
    'frontend/src/features/activity/a.tsx', 'frontend/src/App.tsx',
    'supabase/migrations/001.sql', 'shared/src/index.ts', 'coordination/ownership.json',
    '.github/workflows/coordination.yml',
  ];
  const result = checkChanges(policy, 'p2/project', paths.map(change));
  assert.equal(result.violations.length, paths.length);
  assert.equal(result.violations.at(-1).owner, 'p1');
});

test('dependency files stay P1-owned even inside a feature; unknown roots still fail', () => {
  for (const name of policy.sharedBasenames) {
    const path = `frontend/src/features/projects/${name}`;
    assert.equal(ownerOf(policy, path), 'p1');
    assert.equal(checkChanges(policy, 'p2/project', [change(path)]).violations.length, 1);
  }
  assert.equal(ownerOf(policy, 'unassigned/package.json'), null);
});

test('exact overrides and longest directory prefix are deterministic', () => {
  assert.equal(ownerOf(policy, 'docs/DEMO.md'), 'p5');
  assert.equal(ownerOf(policy, 'docs/CONTRACTS.md'), 'p1');
  const custom = freshPolicy();
  custom.lanes.p2.prefixes.push('docs/projects/');
  validatePolicy(custom);
  assert.equal(ownerOf(custom, 'docs/projects/design.md'), 'p2');
  assert.equal(ownerOf(custom, 'docs/projects-extra/design.md'), 'p1');
});

test('unknown branch prefixes and empty task suffixes fail', () => {
  for (const branch of ['main', 'feature/projects', 'p10/project', 'P2/project', 'p2/', 'p2/  ', null]) {
    assert.equal(checkChanges(policy, branch, [change('README.md')]).lane, null);
  }
});

test('unknown, noncanonical, wrong-case and boundary-lookalike paths fail closed', () => {
  for (const path of ['new.txt', 'Frontend/src/App.tsx', '../README.md', './README.md',
    '/README.md', 'C:/README.md', 'frontend\\src\\App.tsx', 'frontend//src/App.tsx',
    'frontend/src/features/projects-other/a.ts', 'frontend/src/features/projects/../activity/a.ts', 'bad\nname']) {
    assert.equal(ownerOf(policy, path), null, path);
    assert.equal(checkChanges(policy, 'p1/test', [change(path)]).violations.length, 1);
  }
  assert.equal(ownerOf(policy, 'project brief.md'), 'p1');
});

test('deleted paths are checked and both sides of a cross-lane rename are enforced', () => {
  const previous_filename = 'frontend/src/features/activity/a.tsx';
  const filename = 'frontend/src/features/projects/a.tsx';
  assert.equal(checkChanges(policy, 'p2/task', [{ filename: previous_filename, status: 'removed' }]).violations.length, 1);
  const renamed = [{ filename, previous_filename, status: 'renamed' }];
  assert.deepEqual(checkChanges(policy, 'p2/task', renamed).violations.map(v => v.path), [previous_filename]);
  assert.deepEqual(checkChanges(policy, 'p3/task', renamed).violations.map(v => v.path), [filename]);
  assert.deepEqual(changedPaths([...renamed, change(filename)]), [filename, previous_filename]);
  assert.throws(() => changedPaths([{ filename, status: 'renamed' }]), /previous filename/);
  assert.throws(() => changedPaths([{}]), /filename/);
});

test('policy rejects duplicate/unsafe rules and unsupported lane structure', () => {
  const duplicate = freshPolicy();
  duplicate.lanes.p2.files.push('README.md');
  assert.throws(() => validatePolicy(duplicate), /duplicate file/);
  const prefix = freshPolicy();
  prefix.lanes.p2.prefixes.push('docs/');
  assert.throws(() => validatePolicy(prefix), /duplicate directory/);
  const unsafe = freshPolicy();
  unsafe.lanes.p2.prefixes.push('../other/');
  assert.throws(() => validatePolicy(unsafe), /directory/);
  const missing = freshPolicy();
  delete missing.lanes.p5;
  assert.throws(() => validatePolicy(missing), /exactly lanes/);
  const wrongBranch = freshPolicy();
  wrongBranch.lanes.p2.branchPrefix = 'anything/';
  assert.throws(() => validatePolicy(wrongBranch), /Invalid lane/);
  const noDependencies = freshPolicy();
  noDependencies.sharedBasenames = [];
  assert.throws(() => validatePolicy(noDependencies), /reserve dependency/);
});

test('overlap reporting includes original rename paths and excludes independent PRs', () => {
  const own = [{ filename: 'new.ts', previous_filename: 'old.ts', status: 'renamed' }];
  assert.deepEqual(findOverlaps(own, [
    { number: 2, changes: [change('old.ts')] },
    { number: 3, changes: [change('other.ts')] },
  ]), [{ number: 2, paths: ['old.ts'] }]);
});

test('NUL-delimited git parsing handles spaces, renames, copies and deletions', () => {
  assert.deepEqual(parseNameStatus('M\0project brief.md\0R100\0old name\0new name\0D\0gone\0C80\0source\0copy\0'), [
    { status: 'modified', filename: 'project brief.md' },
    { status: 'renamed', previous_filename: 'old name', filename: 'new name' },
    { status: 'removed', filename: 'gone' },
    { status: 'copied', previous_filename: 'source', filename: 'copy' },
  ]);
  assert.deepEqual(parseNameStatus(''), []);
  assert.throws(() => parseNameStatus('R100\0old\0'), /rename/);
});

test('local collection includes committed, staged, unstaged, renamed and untracked changes', t => {
  const dir = mkdtempSync(join(tmpdir(), 'neo-ownership-'));
  t.after(() => {
    const target = resolve(dir);
    assert.equal(dirname(target), resolve(tmpdir()));
    assert.ok(basename(target).startsWith('neo-ownership-'));
    rmSync(target, { recursive: true, force: true });
  });
  const git = args => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.name', 'Coordination Test']);
  git(['config', 'user.email', 'coordination@example.invalid']);
  git(['config', 'commit.gpgsign', 'false']);
  git(['config', 'core.hooksPath', join(dir, 'no-hooks')]);
  git(['config', 'core.autocrlf', 'false']);
  for (const name of ['committed.txt', 'staged.txt', 'unstaged.txt', 'rename from.txt']) writeFileSync(join(dir, name), 'original\n');
  writeFileSync(join(dir, '.gitignore'), 'ignored.txt\n');
  git(['add', '.']);
  git(['commit', '-qm', 'base']);
  git(['checkout', '-qb', 'p2/work']);
  writeFileSync(join(dir, 'committed.txt'), 'committed edit\n');
  git(['add', 'committed.txt']);
  git(['commit', '-qm', 'slice']);
  writeFileSync(join(dir, 'staged.txt'), 'staged edit\n');
  git(['add', 'staged.txt']);
  writeFileSync(join(dir, 'unstaged.txt'), 'unstaged edit\n');
  renameSync(join(dir, 'rename from.txt'), join(dir, 'rename to.txt'));
  git(['add', '-A']);
  writeFileSync(join(dir, 'unstaged.txt'), 'a further unstaged edit\n');
  mkdirSync(join(dir, 'untracked'));
  writeFileSync(join(dir, 'untracked', 'new file.txt'), 'untracked\n');
  writeFileSync(join(dir, 'ignored.txt'), 'ignored\n');
  const changes = collectLocalChanges('main', dir);
  assert.deepEqual(new Set(changedPaths(changes)), new Set([
    'committed.txt', 'staged.txt', 'unstaged.txt', 'rename from.txt', 'rename to.txt', 'untracked/new file.txt',
  ]));
  assert.ok(changes.some(c => c.status === 'renamed' && c.previous_filename === 'rename from.txt'));
});

test('GitHub pagination uses all pages rather than the first 100 files', async () => {
  const calls = [];
  const result = await githubPages(async path => {
    calls.push(path);
    return path.endsWith('page=1') ? Array.from({ length: 100 }, (_, id) => id) : [100];
  }, '/repos/test/repo/pulls/1/files');
  assert.equal(result.length, 101);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /per_page=100&page=2$/);
  await assert.rejects(githubPages(async () => ({}), '/repos/test/repo/pulls'), /non-list/);
});

const event = { number: 7, pull_request: { head: { sha: 'head' }, base: { sha: 'base', repo: { full_name: 'test/repo' } } } };
const metadata = () => ({ changed_files: 1, head: { sha: 'head', ref: 'p2/project' }, base: { sha: 'base' } });

test('GitHub mode derives branch/files from the current immutable PR snapshot', async () => {
  const result = await collectGitHubChanges(event, 'test/repo', async path => path.includes('/files?')
    ? [change('frontend/src/features/projects/a.tsx')] : metadata());
  assert.equal(result.branch, 'p2/project');
  assert.equal(checkChanges(policy, result.branch, result.changes).violations.length, 0);
});

test('GitHub mode fails closed on stale, truncated, oversized or inconsistent snapshots', async () => {
  await assert.rejects(collectGitHubChanges(event, 'wrong/repo', async () => metadata()), /event/);
  await assert.rejects(collectGitHubChanges(event, 'test/repo', async () => ({ ...metadata(), head: { sha: 'new' } })), /moved/);
  await assert.rejects(collectGitHubChanges(event, 'test/repo', async path => path.includes('/files?') ? [] : metadata()), /Incomplete/);
  await assert.rejects(collectGitHubChanges(event, 'test/repo', async () => ({ ...metadata(), changed_files: 3001 })), /caps file lists/);
  let reads = 0;
  await assert.rejects(collectGitHubChanges(event, 'test/repo', async path => {
    if (path.includes('/files?')) return [change('README.md')];
    return ++reads === 1 ? metadata() : { ...metadata(), base: { sha: 'moved' } };
  }), /moved during/);
});

test('GitHub API client has read-only requests, timeout and no token in errors', async () => {
  const get = githubClient('test-token', async (url, options) => {
    assert.equal(url, 'https://api.github.com/repos/test/repo/pulls');
    assert.equal(options.method, undefined);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: false, status: 403 };
  });
  await assert.rejects(get('/repos/test/repo/pulls'), error => /403/.test(error.message) && !error.message.includes('test-token'));
  await assert.rejects(get('https://untrusted.invalid/'), /repository API/);
  assert.throws(() => githubClient(''), /GITHUB_TOKEN/);
});

test('CLI help needs no dependencies; unknown options fail instead of skipping checks', () => {
  const script = join(root, 'scripts', 'coordination', 'check-ownership.mjs');
  const help = spawnSync(process.execPath, [script, '--help'], { cwd: root, encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
  const invalid = spawnSync(process.execPath, [script, '--skip'], { cwd: root, encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Unknown option/);
});

test('workflow checks out the base commit with read-only permissions and no PR execution', () => {
  const workflow = readFileSync(join(root, '.github', 'workflows', 'coordination.yml'), 'utf8');
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /pull-requests: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /--github/);
  assert.doesNotMatch(workflow, /pull_request_target|npm (ci|install)|head\.sha/);
});
