import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../state/ProjectsContext';
import type { Compensation, Project, ProjectNeed, Stage, Town, WorkMode, WorkType } from '../../types';

const towns: Town[] = ['Newcastle', 'Durham', 'Sunderland', 'Teesside', 'Gateshead', 'Northumberland'];
const stages: Stage[] = ['Idea', 'Prototype', 'MVP', 'Early users'];
const workTypes: WorkType[] = ['Cofounder', 'Ongoing contributor', 'Short task', 'Mentor'];
const workModes: WorkMode[] = ['Remote', 'Hybrid', 'In person'];
const compensations: Compensation[] = ['Unspecified', 'Voluntary', 'Paid', 'Equity discussion'];
const accents = ['#1f6f8b', '#3f7d4e', '#b5523b', '#7a5aa6', '#c48a1d'];

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function NewProjectPage() {
  const { addProject, projects } = useProjects();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', tagline: '', problem: '', solution: '', sector: '',
    location: 'Durham' as Town, stage: 'Idea' as Stage,
    needTitle: '', needSkills: '', needHours: 5,
    needType: 'Ongoing contributor' as WorkType, needMode: 'Hybrid' as WorkMode,
    needComp: 'Unspecified' as Compensation,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    let slug = slugify(form.title) || 'project';
    if (projects.some((p) => p.slug === slug)) slug = `${slug}-${projects.length}`;
    const now = new Date().toISOString();

    const needs: ProjectNeed[] = form.needTitle
      ? [{
          id: `${slug}-need-1`,
          title: form.needTitle,
          description: '',
          requiredSkills: form.needSkills.split(',').map((s) => s.trim()).filter(Boolean),
          desirableSkills: [],
          workType: form.needType,
          hoursPerWeek: form.needHours,
          workMode: form.needMode,
          compensation: form.needComp,
          status: 'Open',
        }]
      : [];

    const project: Project = {
      slug,
      title: form.title,
      tagline: form.tagline,
      problem: form.problem,
      solution: form.solution,
      sector: form.sector || 'Other',
      location: form.location,
      stage: form.stage,
      status: 'Active',
      accent: accents[projects.length % accents.length],
      createdAt: now,
      followers: 0,
      team: [{ person: { id: 'me', name: 'You', headline: 'Founder', location: form.location }, role: 'Founder' }],
      needs,
      posts: [{ id: `${slug}-p1`, type: 'Announcement', authorId: 'me', date: now, substantive: true, body: `${form.title} is now on Built in the North.` }],
      milestones: [],
    };

    addProject(project);
    navigate(`/projects/${slug}`);
  }

  return (
    <form className="new-project" onSubmit={handleSubmit}>
      <h1 className="page-title">Start a project</h1>
      <p className="muted">Share enough for people to get it. You do not need to give away anything proprietary.</p>

      <section className="card pad form-section">
        <h3>The pitch</h3>
        <Field label="Project name">
          <input required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. QuayWatch" />
        </Field>
        <Field label="One-line summary">
          <input required value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="What it does, in one sentence" />
        </Field>
        <Field label="What problem are you solving?">
          <textarea required value={form.problem} onChange={(e) => set('problem', e.target.value)} />
        </Field>
        <Field label="Your proposed solution">
          <textarea required value={form.solution} onChange={(e) => set('solution', e.target.value)} />
        </Field>
        <div className="form-row">
          <Field label="Sector">
            <input value={form.sector} onChange={(e) => set('sector', e.target.value)} placeholder="e.g. Climate" />
          </Field>
          <Field label="Location">
            <select value={form.location} onChange={(e) => set('location', e.target.value as Town)}>
              {towns.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Stage">
            <select value={form.stage} onChange={(e) => set('stage', e.target.value as Stage)}>
              {stages.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="card pad form-section">
        <h3>First open role <span className="muted small">(optional)</span></h3>
        <Field label="What do you need?">
          <input value={form.needTitle} onChange={(e) => set('needTitle', e.target.value)} placeholder="e.g. React developer for our dashboard" />
        </Field>
        <Field label="Required skills (comma separated)">
          <input value={form.needSkills} onChange={(e) => set('needSkills', e.target.value)} placeholder="React, TypeScript" />
        </Field>
        <div className="form-row">
          <Field label="Hours / week">
            <input type="number" min={1} max={40} value={form.needHours} onChange={(e) => set('needHours', Number(e.target.value))} />
          </Field>
          <Field label="Role type">
            <select value={form.needType} onChange={(e) => set('needType', e.target.value as WorkType)}>
              {workTypes.map((w) => <option key={w}>{w}</option>)}
            </select>
          </Field>
          <Field label="Work mode">
            <select value={form.needMode} onChange={(e) => set('needMode', e.target.value as WorkMode)}>
              {workModes.map((w) => <option key={w}>{w}</option>)}
            </select>
          </Field>
          <Field label="Compensation">
            <select value={form.needComp} onChange={(e) => set('needComp', e.target.value as Compensation)}>
              {compensations.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <button className="btn btn-primary" type="submit">Publish project page</button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
