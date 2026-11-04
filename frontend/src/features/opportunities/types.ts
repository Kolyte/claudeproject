// Local mirror of docs/CONTRACTS.md v1. Replace with `import type` from
// @neo/contracts once P1 publishes the shared package.

export type ParticipationType = 'cofounder' | 'contributor' | 'task' | 'mentor';
export type WorkMode = 'local' | 'remote' | 'hybrid';
export type NeedStatus = 'open' | 'reviewing' | 'filled' | 'closed';
export type Compensation = 'paid' | 'voluntary' | 'equity_discussion' | 'unspecified';
export type ApplicationStatus = 'submitted' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';

export interface NeedFields {
  title: string;
  description: string;
  requiredSkills: string[];
  desirableSkills: string[];
  participationType: ParticipationType;
  hoursPerWeek: number;
  workMode: WorkMode;
  location: string;
  compensation: Compensation;
}

export interface Need extends NeedFields {
  id: string;
  projectId: string;
  status: NeedStatus;
  createdAt: string;
}

export interface Application {
  id: string;
  needId: string;
  applicantId: string;
  message: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationReview = Application & {
  applicant: { displayName: string; declaredSkills: string[]; hoursPerWeek: number | null };
};

export interface Page<T> {
  data: T[];
  pagination: { limit: number; offset: number; total: number };
}

export interface ProjectNeedsProps {
  projectId: string;
  canManage: boolean;
}
