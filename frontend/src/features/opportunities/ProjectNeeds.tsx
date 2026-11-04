import { type FormEvent, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { ActivityProps, Application, ApplicationStatus, Need, NeedStatus, Page } from '@neo/contracts'
import { Feedback, Field, Pager } from '../../components/ui/Feedback'
import { ApiClientError, message, save } from '../../lib/api'
import { useResource } from '../../lib/useResource'
import { useAuth } from '../auth'
import { compensationLabels, needStatusLabels, participationLabels, workModeLabels } from './labels'
import NeedForm from './NeedForm'
import './opportunities.css'

const STATUS_ORDER: Record<NeedStatus, number> = { open: 0, reviewing: 1, filled: 2, closed: 3 }

function ApplyPanel({ need, onConflict }: { need: Need; onConflict: () => void }) {
  const { session, profile } = useAuth()
  const location = useLocation()
  const [applying, setApplying] = useState(false)
  const [sent, setSent] = useState(false)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!session) {
    const destination = `${location.pathname}${location.search}#need-${need.id}`
    return <Link className="btn btn-primary btn-sm op-self-start" to={`/login?next=${encodeURIComponent(destination)}`}>Sign in to apply</Link>
  }
  if (sent) return <p role="status">Application sent. <Link to="/dashboard/applications">Track your application</Link></p>
  if (!applying) return <button className="btn btn-primary btn-sm op-self-start" onClick={() => setApplying(true)}>Apply for this opportunity</button>

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      await save<Application>(`/needs/${need.id}/applications`, { message: body })
      setSent(true)
    } catch (caught) {
      setError(message(caught))
      // A stale page: this account already applied, or the need just closed.
      if (caught instanceof ApiClientError && caught.status === 409) onConflict()
    } finally {
      setBusy(false)
    }
  }

  return <form className="neo-form" onSubmit={submit}>
    <Field label="Why are you a good fit?"><textarea required maxLength={5000} value={body} onChange={event => setBody(event.target.value)} /></Field>
    <Feedback error={error} />
    <div className="op-actions">
      <button className="btn btn-primary btn-sm" disabled={busy || !profile || !body.trim()}>{busy ? 'Sending…' : 'Send application'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setApplying(false)} disabled={busy}>Cancel</button>
    </div>
  </form>
}

function NeedCard({ need, canManage, applicationStatus, refresh, refreshApplications }: {
  need: Need
  canManage: boolean
  applicationStatus?: ApplicationStatus
  refresh: () => void
  refreshApplications: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  async function changeStatus(status: NeedStatus) {
    setError('')
    try {
      await save<Need>(`/needs/${need.id}`, { status }, 'PATCH')
      refresh()
    } catch (caught) {
      setError(message(caught))
    }
  }

  if (editing) {
    return <article className="need" id={`need-${need.id}`}>
      <NeedForm projectId={need.projectId} existing={need} onCancel={() => setEditing(false)} onSaved={refresh} />
    </article>
  }

  return <article className="need" id={`need-${need.id}`}>
    <div className="op-need-head">
      <h3>{need.title}</h3>
      {need.status !== 'open' && <span className="badge badge-grey">{needStatusLabels[need.status]}</span>}
    </div>
    <p className="small neo-prose">{need.description}</p>
    {need.requiredSkills.length + need.desirableSkills.length > 0 && <div className="row gap-sm wrap">
      {need.requiredSkills.map(skill => <span className="skill skill-req" key={skill}>{skill}</span>)}
      {need.desirableSkills.map(skill => <span className="skill" key={skill}>{skill} (preferred)</span>)}
    </div>}
    <p className="small muted">{participationLabels[need.participationType]} · {need.hoursPerWeek} h/week · {workModeLabels[need.workMode]} · {need.location} · {compensationLabels[need.compensation]}</p>
    {canManage
      ? <div className="op-actions">
          <label className="op-inline-select small">Status
            <select value={need.status} aria-label={`Status of ${need.title}`} onChange={event => void changeStatus(event.target.value as NeedStatus)}>
              {(Object.keys(needStatusLabels) as NeedStatus[]).map(status => <option key={status} value={status}>{needStatusLabels[status]}</option>)}
            </select>
          </label>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit opportunity</button>
        </div>
      : applicationStatus
        ? <p role="status">You applied: <span className="chip op-status">{applicationStatus}</span> <Link to="/dashboard/applications">Track your application</Link></p>
        : need.status === 'open'
          ? <ApplyPanel need={need} onConflict={() => { refreshApplications(); refresh() }} />
          : <p className="small muted">Not accepting applications.</p>}
    <Feedback error={error} />
  </article>
}

export function ProjectNeeds({ projectId, canManage }: ActivityProps) {
  const { session } = useAuth()
  const [offset, setOffset] = useState(0)
  const [adding, setAdding] = useState(false)
  const resource = useResource<Page<Need>>(`/projects/${projectId}/needs?limit=20&offset=${offset}`)
  // Only used to show past applications; the server still rejects duplicates.
  const applications = useResource<Page<Application>>(session && !canManage ? '/me/applications?limit=50' : null)
  const needs = [...resource.data?.data ?? []].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])

  return <aside className="col-side neo-needs">
    <section className="card pad op-needs">
      <div className="op-need-head">
        <h2>Opportunities</h2>
        {canManage && !adding && <button className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}>Add an opportunity</button>}
      </div>
      {adding && <div className="need"><NeedForm projectId={projectId} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); resource.refresh() }} /></div>}
      <Feedback loading={resource.loading} error={resource.error} retry={resource.refresh} />
      {resource.data && needs.length === 0 && !adding && <p className="muted small">{canManage ? 'Add an opportunity to tell people how they can help.' : 'No opportunities posted yet.'}</p>}
      {needs.map(need => <NeedCard
        key={need.id}
        need={need}
        canManage={canManage}
        applicationStatus={applications.data?.data.find(application => application.needId === need.id)?.status}
        refresh={resource.refresh}
        refreshApplications={applications.refresh}
      />)}
      {resource.data && <Pager pagination={resource.data.pagination} onPage={setOffset} />}
    </section>
  </aside>
}
