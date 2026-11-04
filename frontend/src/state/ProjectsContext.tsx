// In-memory store for now. When Supabase is added, replace the bodies of these
// functions with Supabase queries and keep the same interface for the pages.
import { createContext, useContext, useState, type ReactNode } from 'react';
import { projects as seed } from '../data/mockData';
import type { Project } from '../../types';

interface ProjectsState {
  projects: Project[];
  addProject: (p: Project) => void;
  followed: string[];
  toggleFollow: (slug: string) => void;
  applied: string[]; // need ids
  apply: (needId: string) => void;
}

const ProjectsContext = createContext<ProjectsState | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(seed);
  const [followed, setFollowed] = useState<string[]>([]);
  const [applied, setApplied] = useState<string[]>([]);

  const value: ProjectsState = {
    projects,
    addProject: (p) => setProjects((prev) => [p, ...prev]),
    followed,
    toggleFollow: (slug) =>
      setFollowed((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])),
    applied,
    apply: (needId) => setApplied((prev) => (prev.includes(needId) ? prev : [...prev, needId])),
  };

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used inside <ProjectsProvider>');
  return ctx;
}
