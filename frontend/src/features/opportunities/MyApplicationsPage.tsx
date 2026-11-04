import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Application, ApplicationStatus, Page } from '@neo/contracts'
import { Feedback, Pager } from '../../components/ui/Feedback'
import { message, save } from '../../lib/api'
import { useResource } from '../../lib/useResource'
import { formatDate } from './labels'
import './opportunities.css'

const WITHDRAWABLE: readonly ApplicationStatus[] = ['submitted', 'reviewing']

export function MyApplicationsPage() {
  const [offset, setOffset] = useState(0)
  const resource = useResource<Page<Application>>(`/me/applications?limit=20&offset=${offset}`)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  async function withdraw(applicationId: string) {
    setBusyId(applicationId); setError('')
    try {
      await save<Application>(`/applications/${applicationId}`, { status: 'withdrawn' }, 'PATCH')
      resource.refresh()
    } catch (caught) {
      setError(message(caught))
    } finally {
      setBusyId('')
    }
  }

  return <section className="op-page">
    <h1 className="page-title">Your applications</h1>
    <Feedback loading={resource.loading} error={resource.error || error} retry={resource.refresh} />
    {resource.data?.data.length === 0 && <div className="empty"><p>You have not applied to any opportunities yet.</p><Link to="/explore">Explore projects</Link></div>}
    {resource.data && <ul className="op-list">{resource.data.data.map(application => <li key={application.id} className="card pad op-stack">
      <div className="op-need-head">
        <strong>Applied {formatDate(application.createdAt)}</strong>
        <span className="chip op-status">{application.status}</span>
      </div>
      <p className="small neo-prose">{application.message}</p>
      {WITHDRAWABLE.includes(application.status) && <button className="btn btn-secondary btn-sm op-self-start" disabled={Boolean(busyId)} onClick={() => void withdraw(application.id)}>{busyId === application.id ? 'Saving…' : 'Withdraw application'}</button>}
    </li>)}</ul>}
    {resource.data && <Pager pagination={resource.data.pagination} onPage={setOffset} />}
  </section>
}
