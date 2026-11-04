// Shared types. These mirror the "Core Entities" in the spec so that swapping
// mock data for Supabase later is mostly a matter of changing where data comes from.

export type Stage = 'Idea' | 'Prototype' | 'MVP' | 'Early users';
export type ProjectStatus = 'Active' | 'Paused' | 'Completed';
export type ActivityLabel = 'Recently active' | 'Quiet' | 'Dormant';
export type PostType = 'Progress update' | 'Milestone' | 'Roadblock' | 'Opportunity' | 'Announcement';
export type WorkType = 'Cofounder' | 'Ongoing contributor' | 'Short task' | 'Mentor';
export type WorkMode = 'Remote' | 'Hybrid' | 'In person';
export type Compensation = 'Paid' | 'Voluntary' | 'Equity discussion' | 'Unspecified';
export type NeedStatus = 'Open' | 'Reviewing' | 'Filled' | 'Closed';
export type Town = 'Newcastle' | 'Durham' | 'Sunderland' | 'Teesside' | 'Gateshead' | 'Northumberland';

export interface Person {
  id: string;
  name: string;
  headline: string;
  location: Town;
}

export interface TeamMember {
  person: Person;
  role: string;
}

export interface ProjectNeed {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  desirableSkills: string[];
  workType: WorkType;
  hoursPerWeek: number;
  workMode: WorkMode;
  compensation: Compensation;
  status: NeedStatus;
}

export interface ProjectPost {
  id: string;
  type: PostType;
  authorId: string;
  date: string; // ISO date
  body: string;
  substantive: boolean; // counts towards "last substantive update"
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  evidenceUrl?: string;
  verified: boolean; // false = founder-reported
}

export interface Project {
  slug: string;
  title: string;
  tagline: string;
  problem: string;
  solution: string;
  sector: string;
  location: Town;
  stage: Stage;
  status: ProjectStatus;
  accent: string; // cover colour until we have cover images
  createdAt: string;
  followers: number;
  team: TeamMember[];
  needs: ProjectNeed[];
  posts: ProjectPost[];
  milestones: Milestone[];
}

export type SkillSource = 'GitHub' | 'Declared' | 'Experience';
export type SkillConfidence = 'Demonstrated' | 'Mentioned only' | 'Self-declared';

export interface UserSkill {
  name: string;
  source: SkillSource;
  confidence: SkillConfidence;
  evidence: string; // what we saw, e.g. "repo uni-timetable: implemented FastAPI service"
}

export interface ContributorProfile {
  name: string;
  location: Town;
  hoursPerWeek: number;
  interests: string[];
  workTypes: WorkType[];
  workModes: WorkMode[];
  skills: UserSkill[];
}
