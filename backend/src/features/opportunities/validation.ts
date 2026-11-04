import { invalid } from './errors.js';
import type {
  ApplicationStatus,
  Compensation,
  NeedFields,
  NeedStatus,
  Pagination,
  ParticipationType,
  WorkMode,
} from './types.js';

const MAX_TITLE = 120;
const MAX_LOCATION = 120;
const MAX_LONG_TEXT = 5000;
const MAX_SKILL = 60;
const MAX_SKILLS = 30;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PARTICIPATION_TYPES: readonly ParticipationType[] = ['cofounder', 'contributor', 'task', 'mentor'];
const WORK_MODES: readonly WorkMode[] = ['local', 'remote', 'hybrid'];
const COMPENSATIONS: readonly Compensation[] = ['paid', 'voluntary', 'equity_discussion', 'unspecified'];
const NEED_STATUSES: readonly NeedStatus[] = ['open', 'reviewing', 'filled', 'closed'];
const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  'submitted',
  'reviewing',
  'accepted',
  'rejected',
  'withdrawn',
];

class FieldError extends Error {}

function text(value: unknown, max: number): string {
  if (typeof value !== 'string') throw new FieldError('Must be text.');
  const trimmed = value.trim();
  if (!trimmed) throw new FieldError('Required.');
  if (trimmed.length > max) throw new FieldError(`Must be ${max} characters or fewer.`);
  return trimmed;
}

function oneOf<T extends string>(allowed: readonly T[]) {
  return (value: unknown): T => {
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
      throw new FieldError(`Must be one of: ${allowed.join(', ')}.`);
    }
    return value as T;
  };
}

function skills(value: unknown): string[] {
  if (!Array.isArray(value)) throw new FieldError('Must be a list of skills.');
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') throw new FieldError('Each skill must be text.');
    const skill = entry.trim();
    if (!skill) throw new FieldError('Skills cannot be blank.');
    if (skill.length > MAX_SKILL) throw new FieldError(`Each skill must be ${MAX_SKILL} characters or fewer.`);
    const key = skill.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(skill);
    }
  }
  if (unique.length > MAX_SKILLS) throw new FieldError(`List at most ${MAX_SKILLS} unique skills.`);
  return unique;
}

function hours(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 80) {
    throw new FieldError('Must be a whole number from 1 to 80.');
  }
  return value;
}

const needFieldParsers: { [K in keyof NeedFields]: (value: unknown) => NeedFields[K] } = {
  title: (value) => text(value, MAX_TITLE),
  description: (value) => text(value, MAX_LONG_TEXT),
  requiredSkills: skills,
  desirableSkills: skills,
  participationType: oneOf(PARTICIPATION_TYPES),
  hoursPerWeek: hours,
  workMode: oneOf(WORK_MODES),
  location: (value) => text(value, MAX_LOCATION),
  compensation: oneOf(COMPENSATIONS),
};

type Parsers = Record<string, (value: unknown) => unknown>;

/** Applies a strict allowlist: unknown fields are errors, never ignored. */
function parseBody(body: unknown, parsers: Parsers, required: readonly string[]): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw invalid('Request body must be a JSON object.');
  }
  const source = body as Record<string, unknown>;
  const fields: Record<string, string> = {};
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(source)) {
    if (!Object.hasOwn(parsers, key)) fields[key] = 'This field cannot be set.';
  }
  for (const key of required) {
    if (!Object.hasOwn(source, key)) fields[key] = 'Required.';
  }
  for (const [key, parse] of Object.entries(parsers)) {
    if (!Object.hasOwn(source, key)) continue;
    try {
      result[key] = parse(source[key]);
    } catch (error) {
      if (!(error instanceof FieldError)) throw error;
      fields[key] = error.message;
    }
  }

  if (Object.keys(fields).length > 0) throw invalid('Check the highlighted fields.', fields);
  return result;
}

export function parseId(value: unknown, name: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw invalid(`Invalid ${name}.`, { [name]: 'Must be a UUID.' });
  }
  return value.toLowerCase();
}

function queryInteger(value: unknown, name: string, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw invalid(`Invalid ${name}.`, { [name]: `Must be a whole number from ${min} to ${max}.` });
  }
  return parsed;
}

export function parsePagination(query: Record<string, unknown>): Pagination {
  return {
    limit: queryInteger(query.limit, 'limit', DEFAULT_LIMIT, 1, MAX_LIMIT),
    offset: queryInteger(query.offset, 'offset', 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function parseNeedCreate(body: unknown): NeedFields {
  const parsed = parseBody(body, needFieldParsers, [
    'title',
    'description',
    'participationType',
    'hoursPerWeek',
    'workMode',
    'location',
  ]);
  const defaults = { requiredSkills: [], desirableSkills: [], compensation: 'unspecified' };
  return { ...defaults, ...parsed } as unknown as NeedFields;
}

export type NeedPatch = Partial<NeedFields> & { status?: NeedStatus };

export function parseNeedPatch(body: unknown): NeedPatch {
  const parsed = parseBody(body, { ...needFieldParsers, status: oneOf(NEED_STATUSES) }, []);
  if (Object.keys(parsed).length === 0) throw invalid('Provide at least one field to change.');
  return parsed as NeedPatch;
}

export function parseApplicationCreate(body: unknown): { message: string } {
  return parseBody(body, { message: (value) => text(value, MAX_LONG_TEXT) }, ['message']) as {
    message: string;
  };
}

export function parseApplicationPatch(body: unknown): { status: ApplicationStatus } {
  return parseBody(body, { status: oneOf(APPLICATION_STATUSES) }, ['status']) as {
    status: ApplicationStatus;
  };
}
