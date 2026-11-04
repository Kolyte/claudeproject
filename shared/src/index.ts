/** Wire contracts only. Import with `import type`; this package has no runtime exports. */
export type ProjectStage = 'idea' | 'prototype' | 'mvp' | 'launched'
export type ProjectStatus = 'active' | 'paused' | 'completed'
export type Visibility = 'draft' | 'public'
export type ParticipationType = 'cofounder' | 'contributor' | 'task' | 'mentor'
export type WorkMode = 'local' | 'remote' | 'hybrid'
export type PostType = 'progress' | 'milestone' | 'roadblock' | 'opportunity' | 'announcement'
export type NeedStatus = 'open' | 'reviewing' | 'filled' | 'closed'
export type Compensation = 'paid' | 'voluntary' | 'equity_discussion' | 'unspecified'
export type ApplicationStatus = 'submitted' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn'
export interface Profile {
  id: string
  displayName: string
  bio: string
  location: string
  declaredSkills: string[]
  interests: string[]
  hoursPerWeek: number | null
  participationTypes: ParticipationType[]
  workModes: WorkMode[]
}
export type ProfilePatch = Partial<Omit<Profile, 'id'>>
export interface Project {
  id: string
  ownerId: string
  ownerDisplayName: string
  title: string
  pitch: string
  problem: string
  solution: string
  sector: string
  location: string
  stage: ProjectStage
  status: ProjectStatus
  visibility: Visibility
  createdAt: string
  updatedAt: string
}
export interface ProjectPost {
  id: string
  projectId: string
  authorId: string
  type: PostType
  body: string
  createdAt: string
}
export interface Milestone {
  id: string
  projectId: string
  title: string
  description: string
  achievedAt: string
  evidenceUrl: string | null
  verification: 'self_reported'
  createdAt: string
}
export interface Need {
  id: string
  projectId: string
  title: string
  description: string
  requiredSkills: string[]
  desirableSkills: string[]
  participationType: ParticipationType
  hoursPerWeek: number
  workMode: WorkMode
  location: string
  compensation: Compensation
  status: NeedStatus
  createdAt: string
}
export interface Application {
  id: string
  needId: string
  applicantId: string
  message: string
  status: ApplicationStatus
  createdAt: string
  updatedAt: string
}
export type ApplicationReview = Application & {
  applicant: Pick<Profile, 'displayName' | 'declaredSkills' | 'hoursPerWeek'>
}
export interface ProjectSummary {
  id: string
  title: string
  pitch: string
  sector: string
  location: string
  stage: ProjectStage
  status: ProjectStatus
  ownerDisplayName: string
  requiredSkills: string[]
  openNeedsCount: number
  lastSubstantiveUpdateAt: string | null
  createdAt: string
}
export interface DiscoveryFilters {
  q?: string
  location?: string
  skill?: string
  sector?: string
  stage?: ProjectStage
  limit: number
  offset: number
}
export interface ActivityProps { projectId: string; canManage: boolean }
export type ApiResponse<T> = { data: T }
export type Page<T> = { data: T[]; pagination: { limit: number; offset: number; total: number } }
export type ApiErrorCode = 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE'
export type ApiError = { error: { code: ApiErrorCode; message: string; fields?: Record<string, string> } }
