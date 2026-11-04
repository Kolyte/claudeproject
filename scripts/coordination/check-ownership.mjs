#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const policyPath = 'coordination/ownership.json';
const expectedLanes = ['p1', 'p2', 'p3', 'p4', 'p5'];

function validPath(value) {
  return typeof value === 'string' && value.length > 0
    && !/[\u0000-\u001f\\:]/u.test(value)
    && value.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}

export function validatePolicy(policy) {
  if (policy?.version !== 1 || !policy.lanes
    || Object.keys(policy.lanes).sort().join(',') !== expectedLanes.join(',')) {
    throw new Error('Policy must have version 1 and exactly lanes p1 through p5.');
  }
  if (policy.sharedOwner !== 'p1' || !Array.isArray(policy.sharedBasenames)
    || !['package.json', 'package-lock.json'].every(name => policy.sharedBasenames.includes(name))
    || policy.sharedBasenames.some(name => !validPath(name) || name.includes('/'))) {
    throw new Error('Policy must reserve dependency basenames for p1.');
  }
  const files = new Set();
  const prefixes = new Set();
  for (const [id, lane] of Object.entries(policy.lanes)) {
    if (lane.branchPrefix !== `${id}/` || !Array.isArray(lane.files) || !Array.isArray(lane.prefixes)) {
      throw new Error(`Invalid lane ${id}: require its pN/ prefix, files and prefixes arrays.`);
    }
    for (const path of lane.files) {
      if (!validPath(path) || files.has(path)) throw new Error(`Invalid or duplicate file rule: ${JSON.stringify(path)}`);
      files.add(path);
    }
    for (const prefix of lane.prefixes) {
      if (typeof prefix !== 'string' || !prefix.endsWith('/')
        || !validPath(prefix.slice(0, -1)) || prefixes.has(prefix)) {
        throw new Error(`Invalid or duplicate directory rule: ${JSON.stringify(prefix)}`);
      }
      prefixes.add(prefix);
    }
  }
  return policy;
}

export function ownerOf(policy, path) {
  if (!validPath(path)) return null;
  let owner = null;
  let length = -1;
  for (const [id, lane] of Object.entries(policy.lanes)) {
    if (lane.files.includes(path)) {
      owner = id;
      break;
    }
    for (const prefix of lane.prefixes) {
      if (path.startsWith(prefix) && prefix.length > length) {
        owner = id;
        length = prefix.length;
      }
    }
  }
  // A manifest inside an otherwise assigned feature directory remains shared.
  if (owner && policy.sharedBasenames.includes(path.split('/').at(-1))) return policy.sharedOwner;
  return owner;
}

export function changedPaths(changes) {
  const paths = new Set();
  for (const change of changes) {
    if (!change || typeof change.filename !== 'string') throw new Error('A change is missing its filename.');
    paths.add(change.filename);
    if (change.previous_filename !== undefined) {
      if (typeof change.previous_filename !== 'string') throw new Error('Invalid previous filename.');
      paths.add(change.previous_filename);
    }
    if (change.status === 'renamed' && !change.previous_filename) {
      throw new Error('A renamed file is missing its previous filename.');
    }
  }
  return [...paths];
}

export function checkChanges(policy, branch, changes) {
  validatePolicy(policy);
  const lane = Object.keys(policy.lanes).find(id => typeof branch === 'string'
    && branch.startsWith(policy.lanes[id].branchPrefix)
    && branch.slice(policy.lanes[id].branchPrefix.length).trim().length > 0);
  if (!lane) return { lane: null, violations: [{ path: null, reason: 'Use an assigned p1/<task> through p5/<task> branch.' }] };
  const violations = [];
  for (const path of changedPaths(changes)) {
    const owner = ownerOf(policy, path);
    if (!owner) {
      violations.push({ path, owner: null, reason: 'Unassigned or invalid path; ask P1 to register a safe path in a separate policy PR.' });
    } else if (owner !== lane) {
      violations.push({ path, owner, reason: `Owned by ${owner.toUpperCase()}; request a change from that lane's human.` });
    }
  }
  return { lane, violations };
}

export function findOverlaps(changes, otherPulls) {
  const ownPaths = new Set(changedPaths(changes));
  return otherPulls.map(pull => ({
    number: pull.number,
    paths: changedPaths(pull.changes).filter(path => ownPaths.has(path)).sort(),
  })).filter(pull => pull.paths.length > 0);
}

export function parseNameStatus(output) {
  const tokens = output.split('\0');
  if (tokens.at(-1) === '') tokens.pop();
  const changes = [];
  for (let i = 0; i < tokens.length;) {
    const status = tokens[i++];
    const first = tokens[i++];
    if (!status || !first) throw new Error('Malformed git name-status output.');
    if (/^[RC]\d+$/u.test(status)) {
      const second = tokens[i++];
      if (!second) throw new Error('Malformed git rename/copy output.');
      changes.push({ status: status.startsWith('R') ? 'renamed' : 'copied', previous_filename: first, filename: second });
    } else {
      if (!/^[AMDTUXB]$/u.test(status)) throw new Error(`Unsupported git change status ${JSON.stringify(status)}.`);
      changes.push({ status: status === 'D' ? 'removed' : 'modified', filename: first });
    }
  }
  return changes;
}

export function collectLocalChanges(base, cwd = process.cwd()) {
  const git = args => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (!base || base.startsWith('-')) throw new Error('Supply a valid base ref, for example origin/main.');
  const mergeBase = git(['merge-base', base, 'HEAD']).trim();
  const tracked = parseNameStatus(git(['diff', '--name-status', '-z', '--find-renames', mergeBase, '--']));
  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  return [...tracked, ...untracked.map(filename => ({ status: 'added', filename }))];
}

export async function githubPages(get, path, maxPages = 100) {
  const result = [];
  const separator = path.includes('?') ? '&' : '?';
  for (let page = 1; page <= maxPages; page++) {
    const items = await get(`${path}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(items)) throw new Error('GitHub returned a non-list page.');
    result.push(...items);
    if (items.length < 100) return result;
  }
  throw new Error('GitHub pagination limit reached; split the PR or reduce open work.');
}

export function githubClient(token, fetcher = fetch) {
  if (!token) throw new Error('GITHUB_TOKEN is required in GitHub mode.');
  return async path => {
    if (!path.startsWith('/repos/')) throw new Error('Only repository API reads are supported.');
    const response = await fetcher(`https://api.github.com${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`GitHub read failed (${response.status}); verify read permissions and retry.`);
    return response.json();
  };
}

export async function collectGitHubChanges(event, repository, get) {
  if (!/^[\w.-]+\/[\w.-]+$/u.test(repository ?? '') || !Number.isInteger(event?.number)
    || event.number < 1 || event.pull_request?.base?.repo?.full_name !== repository) {
    throw new Error('Invalid repository or pull-request event.');
  }
  const path = `/repos/${repository}/pulls/${event.number}`;
  const before = await get(path);
  const sameSnapshot = pull => pull.head?.sha === event.pull_request.head?.sha
    && pull.base?.sha === event.pull_request.base?.sha;
  if (!sameSnapshot(before)) throw new Error('PR head/base moved; update your branch and rerun the current check.');
  if (!Number.isInteger(before.changed_files) || before.changed_files > 3000) {
    throw new Error('Cannot fully enumerate this PR (GitHub caps file lists at 3000); split the change.');
  }
  const changes = await githubPages(get, `${path}/files`, 31);
  if (changes.length !== before.changed_files) throw new Error('Incomplete GitHub file list; validation fails closed.');
  const after = await get(path);
  if (!sameSnapshot(after) || before.changed_files !== after.changed_files) {
    throw new Error('PR moved during validation; rerun the current check.');
  }
  return { branch: before.head.ref, changes };
}

async function overlapWarnings(repository, number, changes, get) {
  const open = await githubPages(get, `/repos/${repository}/pulls?state=open`);
  const others = [];
  for (const pull of open) {
    if (pull.number === number) continue;
    const files = await githubPages(get, `/repos/${repository}/pulls/${pull.number}/files`, 31);
    others.push({ number: pull.number, changes: files });
  }
  for (const overlap of findOverlaps(changes, others)) {
    console.warn(`ADVISORY: overlap with PR #${overlap.number}: ${overlap.paths.map(path => JSON.stringify(path)).join(', ')}`);
  }
}

export async function main(args = process.argv.slice(2)) {
  const options = { base: 'origin/main', branch: null, github: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--github') options.github = true;
    else if (args[i] === '--base' || args[i] === '--branch') {
      const key = args[i].slice(2);
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for --${key}.`);
      options[key] = args[++i];
    } else if (args[i] === '--help') {
      console.log('Usage: node scripts/coordination/check-ownership.mjs [--base origin/main] [--branch pN/task] | --github');
      return 0;
    } else throw new Error(`Unknown option: ${JSON.stringify(args[i])}`);
  }
  if (options.github && (options.branch || options.base !== 'origin/main')) {
    throw new Error('GitHub mode derives its branch/base from the immutable event; no overrides allowed.');
  }
  const policy = validatePolicy(JSON.parse(readFileSync(policyPath, 'utf8')));
  let input;
  let get;
  let event;
  if (options.github) {
    if (process.env.GITHUB_EVENT_NAME !== 'pull_request' || !process.env.GITHUB_EVENT_PATH) {
      throw new Error('GitHub mode requires a pull_request event and its event file.');
    }
    event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    get = githubClient(process.env.GITHUB_TOKEN);
    input = await collectGitHubChanges(event, process.env.GITHUB_REPOSITORY, get);
  } else {
    input = {
      branch: options.branch ?? execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(),
      changes: collectLocalChanges(options.base),
    };
  }
  const result = checkChanges(policy, input.branch, input.changes);
  console.log(`Lane: ${result.lane ?? 'unassigned'}; changed paths checked: ${changedPaths(input.changes).length}`);
  for (const violation of result.violations) console.error(`FAIL ${JSON.stringify(violation.path)}: ${violation.reason}`);
  if (options.github) {
    try {
      await overlapWarnings(process.env.GITHUB_REPOSITORY, event.number, input.changes, get);
    } catch (error) {
      console.warn(`ADVISORY: overlap scan unavailable: ${error.message}. P5 must check open PRs manually.`);
    }
  }
  if (result.violations.length) return 1;
  console.log('Ownership check passed. P5 must still coordinate sequential merges and current overlap review.');
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(`Ownership check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
