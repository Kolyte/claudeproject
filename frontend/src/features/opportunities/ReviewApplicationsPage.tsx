import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Application, ApplicationReview, ApplicationStatus, Need, Page } from '@neo/contracts'
import { Feedback, Pager } from '../../components/ui/Feedback'
import { message, save } from '../../lib/api'
import { useResource } from '../../lib/useResource'
import { formatDate } from './labels'
import './opportunities.css'

const ACTIONS: Partial<Record<ApplicationStatus, { status: ApplicationStatus; label: string; primary?: boolean }[]>> = {
  submitted: [{ status: 'reviewing', label: 'Mark reviewing' }, { status: 'accepted', label: 'Accept', primary: true }, { status: 'rejected', label: 'Reject' }],
  reviewing: [{ status: 'accepted', label: 'Accept', primary: true }, { status: 'rejected', label: 'Reject' }],
}

export function ReviewApplicationsPage() {
  const { projectId } = useParams()
  const [offset, setOffset] = useState(0)
  const resource = useResource<Page<ApplicationReview>>(`/projects/${projectId}/applications?limit=20&offset=${offset}`)
  // Titles are a convenience; the review still works if this request fails.
  const needs = useResource<Page<Need>>(`/projects/${projectId}/needs?limit=50`)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const needTitle = (needId: string) => needs.data?.data.find(need => need.id === needId)?.title

  async function setStatus(applicationId: string, status: ApplicationStatus) {
    setBusyId(applicationId); setError('')
    try {
      await save<Application>(`/applications/${applicationId}`, { status }, 'PATCH')
      resource.refresh()
    } catch (caught) {
      setError(message(caught))
    } finally {
      setBusyId('')
    }
  }

  return <section className="op-page">
    <Link className="small" to={`/projects/${projectId}`}>← Back to project</Link>
    <h1 className="page-title">Review applications</h1>
    <Feedback loading={resource.loading} error={resource.error || error} retry={resource.refresh} />
    {resource.data?.data.length === 0 && <p className="empty">No applications yet.</p>}
    {Boolean(resource.data?.data.length) && <p className="muted small">Accepting records your decision. It does not grant project access or promise equity.</p>}
    {resource.data && <ul className="op-list">{resource.data.data.map(application => <li key={application.id} className="card pad op-stack">
      <div className="op-need-head">
        <div>
          <h2>{application.applicant.displayName}</h2>
          <p className="small muted">{needTitle(application.needId) ?? 'Opportunity'} · Applied {formatDate(application.createdAt)} · {application.applicant.hoursPerWeek ?? 'Unknown'} h/week</p>
        </div>
        <span className="chip op-status">{application.status}</span>
      </div>
      {application.applicant.declaredSkills.length > 0 && <div className="row gap-sm wrap" aria-label="Declared skills">{application.applicant.declaredSkills.map(skill => <span className="skill" key={skill}>{skill}</span>)}</div>}
      <p className="small neo-prose">{application.message}</p>
      {ACTIONS[application.status] && <div className="op-actions">{ACTIONS[application.status]?.map(({ status, label, primary }) => <button key={status} className={`btn btn-sm ${primary ? 'btn-primary' : 'btn-secondary'}`} disabled={Boolean(busyId)} onClick={() => void setStatus(application.id, status)}>{busyId === application.id ? 'Saving…' : label}</button>)}</div>}
    </li>)}</ul>}
    {resource.data && <Pager pagination={resource.data.pagination} onPage={setOffset} />}
  </section>
}
