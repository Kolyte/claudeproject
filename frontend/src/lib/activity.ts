import type { ActivityLabel, Project } from '../../types';

const DAY = 86_400_000;

export function lastSubstantiveUpdate(project: Project): string | null {
  const dates = project.posts.filter((p) => p.substantive).map((p) => p.date).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
}

// Thresholds are a placeholder: the spec lists calibrating these as an open decision.
export function activityLabel(project: Project): ActivityLabel {
  const last = lastSubstantiveUpdate(project);
  if (!last) return 'Dormant';
  const d = daysSince(last);
  if (d <= 14) return 'Recently active';
  if (d <= 45) return 'Quiet';
  return 'Dormant';
}

// "New Ideas" are kept separate so they are not penalised for having no history.
export function isNewIdea(project: Project): boolean {
  return project.stage === 'Idea' || daysSince(project.createdAt) <= 21;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeDate(iso: string): string {
  const d = daysSince(iso);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  const m = Math.round(d / 30);
  return m === 1 ? '1 month ago' : `${m} months ago`;
}

export function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}
