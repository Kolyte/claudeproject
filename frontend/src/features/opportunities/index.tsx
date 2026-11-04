import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { ActivityProps, ApiResponse, Application, ApplicationReview, ApplicationStatus, Need, NeedStatus, Page } from '@neo/contracts'
import { useAuth } from '../auth'
import { useResource } from '../../lib/useResource'
import { save, message } from '../../lib/api'
import { Feedback, Field, Pager } from '../../components/ui/Feedback'

export function ProjectNeeds({ projectId, canManage }: ActivityProps) {
  const [offset, setOffset] = useState(0)
  const resource = useResource<Page<Need>>(`/projects/${projectId}/needs?limit=20&offset=${offset}`)
  return <aside className="col-side neo-needs"><section className="card pad"><h2>Opportunities</h2>
    <Feedback loading={resource.loading} error={resource.error} retry={resource.refresh} />
    {resource.data && <>{resource.data.data.length === 0 && <p className="muted">No opportunities posted yet.</p>}{resource.data.data.map(need => <NeedItem key={need.id} need={need} canManage={canManage} refresh={resource.refresh} />)}<Pager pagination={resource.data.pagination} onPage={setOffset} /></>}
  </section>{canManage && <section className="card pad"><h2>Add an opportunity</h2><NeedForm projectId={projectId} onSaved={resource.refresh} /></section>}</aside>
}
function NeedItem({ need, canManage, refresh }: { need: Need; canManage: boolean; refresh: () => void }) {
  const { session, profile } = useAuth()
  const location = useLocation()
  const [editing, setEditing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [sent, setSent] = useState(false)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function apply(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { await save<Application>(`/needs/${need.id}/applications`, { message: body }); setSent(true); setApplying(false) } catch (error) { setError(message(error)) } finally { setBusy(false) }
  }
  return <article className="need" id={`need-${need.id}`}><h3>{need.title}</h3><span className="chip">{need.status}</span><p className="neo-prose">{need.description}</p>
    <div className="row gap-sm wrap">{need.requiredSkills.map(skill => <span className="skill skill-req" key={skill}>{skill}</span>)}{need.desirableSkills.map(skill => <span className="skill" key={skill}>{skill} (preferred)</span>)}</div>
    <p className="small muted">{need.participationType} · {need.hoursPerWeek} h/week · {need.workMode} · {need.location} · {need.compensation.replaceAll('_', ' ')}</p>
    {canManage ? <><button className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Cancel editing' : 'Edit opportunity'}</button>{editing && <NeedForm projectId={need.projectId} existing={need} onSaved={() => { setEditing(false); refresh() }} />}</> : need.status === 'open' && <>
      {!session ? <Link className="btn btn-primary btn-sm" to={`/login?next=${encodeURIComponent(location.pathname + location.search + `#need-${need.id}`)}`}>Sign in to apply</Link> : sent ? <p role="status">Application sent. <Link to="/dashboard/applications">Track your application</Link></p> : applying ? <form className="neo-form" onSubmit={apply}><Field label="Why are you a good fit?"><textarea required maxLength={5000} value={body} onChange={e => setBody(e.target.value)} /></Field><button disabled={busy || !profile} className="btn btn-primary btn-sm">{busy ? 'Sending…' : 'Send application'}</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setApplying(false)}>Cancel</button></form> : <button className="btn btn-primary btn-sm" onClick={() => setApplying(true)}>Apply for this opportunity</button>}
    </>}
    <Feedback error={error} />
  </article>
}
type NeedFields = Omit<Need, 'id' | 'projectId' | 'createdAt'>
function NeedForm({ projectId, existing, onSaved }: { projectId: string; existing?: Need; onSaved: () => void }) {
  const [form, setForm] = useState<NeedFields>(existing ?? { title: '', description: '', requiredSkills: [], desirableSkills: [], participationType: 'contributor', hoursPerWeek: 5, workMode: 'hybrid', location: '', compensation: 'unspecified', status: 'open' })
  const [required, setRequired] = useState(existing?.requiredSkills.join(', ') ?? '')
  const [desirable, setDesirable] = useState(existing?.desirableSkills.join(', ') ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = <K extends keyof NeedFields>(key: K, value: NeedFields[K]) => setForm(prev => ({ ...prev, [key]: value }))
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const { title, description, participationType, hoursPerWeek, workMode, location, compensation, status } = form
      await save<ApiResponse<Need>>(existing ? `/needs/${existing.id}` : `/projects/${projectId}/needs`, { title, description, participationType, hoursPerWeek, workMode, location, compensation, status, requiredSkills: required.split(',').map(s => s.trim()).filter(Boolean), desirableSkills: desirable.split(',').map(s => s.trim()).filter(Boolean) }, existing ? 'PATCH' : 'POST')
      if (!existing) { setForm({ ...form, title: '', description: '', requiredSkills: [], desirableSkills: [] }); setRequired(''); setDesirable('') }
      onSaved()
    } catch (error) { setError(message(error)) } finally { setBusy(false) }
  }
  return <form className="neo-form" onSubmit={submit}>
    <Field label="Opportunity title"><input required maxLength={120} value={form.title} onChange={e => set('title', e.target.value)} /></Field>
    <Field label="What help do you need?"><textarea required maxLength={5000} value={form.description} onChange={e => set('description', e.target.value)} /></Field>
    <Field label="Required skills (comma separated)"><input value={required} onChange={e => setRequired(e.target.value)} /></Field>
    <Field label="Desirable skills (comma separated)"><input value={desirable} onChange={e => setDesirable(e.target.value)} /></Field>
    <Field label="Participation"><select value={form.participationType} onChange={e => set('participationType', e.target.value as Need['participationType'])}>{['cofounder', 'contributor', 'task', 'mentor'].map(value => <option key={value}>{value}</option>)}</select></Field>
    <Field label="Hours per week"><input required type="number" min={1} max={80} value={form.hoursPerWeek} onChange={e => set('hoursPerWeek', Number(e.target.value))} /></Field>
    <Field label="Work mode"><select value={form.workMode} onChange={e => set('workMode', e.target.value as Need['workMode'])}>{['local', 'remote', 'hybrid'].map(value => <option key={value}>{value}</option>)}</select></Field>
    <Field label="Location"><input required maxLength={120} value={form.location} onChange={e => set('location', e.target.value)} /></Field>
    <Field label="Compensation"><select value={form.compensation} onChange={e => set('compensation', e.target.value as Need['compensation'])}>{['paid', 'voluntary', 'equity_discussion', 'unspecified'].map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></Field>
    <Field label="Opportunity status"><select value={form.status} onChange={e => set('status', e.target.value as NeedStatus)}>{['open', 'reviewing', 'filled', 'closed'].map(value => <option key={value}>{value}</option>)}</select></Field>
    <Feedback error={error} /><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : existing ? 'Save opportunity' : 'Add opportunity'}</button>
  </form>
}
export function MyApplicationsPage() { return <ApplicationsPage review={false} /> }
export function ReviewApplicationsPage() { return <ApplicationsPage review /> }
function ApplicationsPage({ review }: { review: boolean }) {
  const { projectId } = useParams()
  const { session } = useAuth()
  const [offset, setOffset] = useState(0)
  const path = review ? `/projects/${projectId}/applications` : '/me/applications'
  const resource = useResource<Page<Application | ApplicationReview>>(`${path}?limit=20&offset=${offset}&account=${encodeURIComponent(session!.user.id)}`)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  async function change(id: string, status: ApplicationStatus) {
    setBusy(id); setError('')
    try { await save<Application>(`/applications/${id}`, { status }, 'PATCH'); resource.refresh() } catch (error) { setError(message(error)) } finally { setBusy('') }
  }
  return <section><h1>{review ? 'Review applications' : 'Your applications'}</h1>{review && <Link to={`/projects/${projectId}`}>← Back to project</Link>}
    <Feedback loading={resource.loading} error={resource.error || error} retry={resource.refresh} />
    {resource.data && <>{resource.data.data.length === 0 && <p className="empty">No applications yet.</p>}<div className="neo-application-list">{resource.data.data.map(application => <article className="card pad" key={application.id}>
      {'applicant' in application && <><h2>{application.applicant.displayName}</h2><p>{application.applicant.declaredSkills.join(', ') || 'No declared skills'} · {application.applicant.hoursPerWeek ?? 'Unknown'} h/week</p></>}
      <p className="neo-prose">{application.message}</p><p><span className="chip">{application.status}</span> · Submitted {new Date(application.createdAt).toLocaleDateString('en-GB')}</p>
      {['submitted', 'reviewing'].includes(application.status) && <div className="row gap-sm wrap">{(review ? ['reviewing', 'accepted', 'rejected'] : ['withdrawn']).map(status => <button disabled={Boolean(busy)} className="btn btn-secondary btn-sm" key={status} onClick={() => change(application.id, status as ApplicationStatus)}>{busy === application.id ? 'Saving…' : status === 'withdrawn' ? 'Withdraw application' : status === 'reviewing' ? 'Mark reviewing' : status === 'accepted' ? 'Accept' : 'Reject'}</button>)}</div>}
    </article>)}</div><Pager pagination={resource.data.pagination} onPage={setOffset} /></>}
  </section>
}
