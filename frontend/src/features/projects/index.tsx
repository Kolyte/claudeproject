import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ApiResponse, Page, Project, ProjectStage, ProjectStatus, Visibility } from '@neo/contracts'
import { useAuth } from '../auth'
import { ProjectActivity } from '../activity'
import { ProjectNeeds } from '../opportunities'
import { SectorInput } from '../discovery'
import { useResource } from '../../lib/useResource'
import { message, save } from '../../lib/api'
import { Feedback, Field, Pager } from '../../components/ui/Feedback'

export function ProjectPage() {
  const { projectId } = useParams()
  const { session, loading: authLoading } = useAuth()
  const resource = useResource<ApiResponse<Project>>(authLoading ? null : `/projects/${projectId}`)
  if (authLoading || resource.loading || resource.error) return <Feedback loading={authLoading || resource.loading} error={resource.error} retry={resource.refresh} />
  const project = resource.data?.data
  if (!project) return null
  const canManage = session?.user.id === project.ownerId
  return <article className="neo-project">
    <Link to="/explore">← Explore projects</Link>
    <header className="project-header"><div><div className="row gap-sm wrap"><span className="chip">{project.stage}</span><span className="chip">{project.status}</span>{project.visibility === 'draft' && <span className="tag tag-warn">Private draft</span>}</div>
      <h1>{project.title || 'Untitled draft'}</h1><p className="lead">{project.pitch}</p><p className="muted">{project.location} · {project.sector} · {project.ownerDisplayName}</p></div>
      {canManage && <div className="row gap-sm wrap"><Link className="btn btn-secondary" to={`/projects/${project.id}/edit`}>Edit project</Link><Link className="btn btn-secondary" to={`/projects/${project.id}/applications`}>Review applications</Link></div>}
    </header>
    <section className="card pad"><h2>The problem</h2><p className="neo-prose">{project.problem || 'No problem statement yet.'}</p><h2>The solution</h2><p className="neo-prose">{project.solution || 'No solution described yet.'}</p></section>
    <div className="two-col neo-project-sections"><ProjectActivity projectId={project.id} canManage={canManage} /><ProjectNeeds projectId={project.id} canManage={canManage} /></div>
  </article>
}

export function NewProjectPage() {
  const { profile, error, refreshProfile } = useAuth()
  if (!profile) return <Feedback loading={!error} error={error} retry={() => { void refreshProfile().catch(() => {}) }} />
  return <ProjectForm />
}
export function EditProjectPage() {
  const { projectId } = useParams()
  const { session } = useAuth()
  const resource = useResource<ApiResponse<Project>>(`/projects/${projectId}`)
  if (resource.loading || resource.error) return <Feedback loading={resource.loading} error={resource.error} retry={resource.refresh} />
  const project = resource.data?.data
  if (!project) return null
  if (project.ownerId !== session?.user.id) return <Feedback error="Only the owner can edit this project." />
  return <ProjectForm key={project.id} existing={project} />
}
type ProjectFields = Pick<Project, 'title' | 'pitch' | 'problem' | 'solution' | 'sector' | 'location' | 'stage' | 'status' | 'visibility'>
function ProjectForm({ existing }: { existing?: Project }) {
  const [form, setForm] = useState<ProjectFields>(() => existing ? {
    title: existing.title, pitch: existing.pitch, problem: existing.problem, solution: existing.solution,
    sector: existing.sector, location: existing.location, stage: existing.stage, status: existing.status, visibility: existing.visibility,
  } : { title: '', pitch: '', problem: '', solution: '', sector: '', location: '', stage: 'idea', status: 'active', visibility: 'draft' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const set = <K extends keyof ProjectFields>(key: K, value: ProjectFields[K]) => setForm(prev => ({ ...prev, [key]: value }))
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const { status: _status, visibility: _visibility, ...draft } = form
      const { data } = await save<Project>(existing ? `/projects/${existing.id}` : '/projects', existing ? form : draft, existing ? 'PATCH' : 'POST')
      navigate(`/projects/${data.id}`)
    } catch (error) { setError(message(error)) } finally { setBusy(false) }
  }
  return <form className="new-project neo-form" onSubmit={submit}>
    <h1>{existing ? 'Edit your project' : 'Start a project'}</h1><p className="muted">Save a private draft first. Publish when your pitch is ready for people to read.</p>
    <section className="card pad neo-form">
      <Field label="Project title"><input required maxLength={120} value={form.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field label="One-line pitch"><input required maxLength={300} value={form.pitch} onChange={e => set('pitch', e.target.value)} /></Field>
      <Field label="Problem"><textarea required maxLength={5000} value={form.problem} onChange={e => set('problem', e.target.value)} /></Field>
      <Field label="Solution"><textarea required maxLength={5000} value={form.solution} onChange={e => set('solution', e.target.value)} /></Field>
      <div className="form-row"><SectorInput label="Sector" className="field" required value={form.sector} onChange={sector => set('sector', sector)} /><Field label="Location"><input required maxLength={120} value={form.location} onChange={e => set('location', e.target.value)} /></Field></div>
      <Field label="Stage"><select value={form.stage} onChange={e => set('stage', e.target.value as ProjectStage)}>{['idea', 'prototype', 'mvp', 'launched'].map(value => <option key={value}>{value}</option>)}</select></Field>
      {existing && <div className="form-row"><Field label="Status"><select value={form.status} onChange={e => set('status', e.target.value as ProjectStatus)}>{['active', 'paused', 'completed'].map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Visibility"><select value={form.visibility} onChange={e => set('visibility', e.target.value as Visibility)}><option value="draft">Private draft</option><option value="public">Published</option></select></Field></div>}
    </section>
    <Feedback error={error} /><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : existing ? 'Save changes' : 'Save private draft'}</button>
  </form>
}
export function MyProjectsPage() {
  const [offset, setOffset] = useState(0)
  const { session } = useAuth()
  const resource = useResource<Page<Project>>(`/me/projects?offset=${offset}&limit=20&account=${encodeURIComponent(session!.user.id)}`)
  return <section><div className="row gap-sm wrap"><h1>Your projects</h1><Link className="btn btn-primary btn-sm" to="/projects/new">Start a project</Link></div>
    <Feedback loading={resource.loading} error={resource.error} retry={resource.refresh} />
    {resource.data && <>{resource.data.data.length === 0 && <p className="empty">You have no projects yet.</p>}<div className="grid">{resource.data.data.map(project => <article className="card pad" key={project.id}><span className="chip">{project.visibility === 'draft' ? 'Private draft' : project.status}</span><h2><Link to={`/projects/${project.id}`}>{project.title || 'Untitled draft'}</Link></h2><p>{project.pitch}</p><div className="row gap-sm wrap"><Link to={`/projects/${project.id}/edit`}>Edit</Link><Link to={`/projects/${project.id}/applications`}>Review applications</Link></div></article>)}</div><Pager pagination={resource.data.pagination} onPage={setOffset} /></>}
  </section>
}
