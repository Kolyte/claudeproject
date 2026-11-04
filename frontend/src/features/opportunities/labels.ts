import type { ApplicationStatus, Compensation, NeedStatus, ParticipationType, WorkMode } from './types';

export const participationLabels: Record<ParticipationType, string> = {
  cofounder: 'Cofounder',
  contributor: 'Ongoing contributor',
  task: 'Short task',
  mentor: 'Mentor',
};

export const workModeLabels: Record<WorkMode, string> = {
  local: 'In person',
  remote: 'Remote',
  hybrid: 'Hybrid',
};

export const compensationLabels: Record<Compensation, string> = {
  paid: 'Paid',
  voluntary: 'Voluntary',
  equity_discussion: 'Equity discussion',
  unspecified: 'Compensation unspecified',
};

export const needStatusLabels: Record<NeedStatus, string> = {
  open: 'Open',
  reviewing: 'Reviewing',
  filled: 'Filled',
  closed: 'Closed',
};

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  reviewing: 'In review',
  accepted: 'Accepted',
  rejected: 'Not selected',
  withdrawn: 'Withdrawn',
};

export const applicationBadge: Record<ApplicationStatus, string> = {
  submitted: 'badge-blue',
  reviewing: 'badge-amber',
  accepted: 'badge-green',
  rejected: 'badge-grey',
  withdrawn: 'badge-grey',
};

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
