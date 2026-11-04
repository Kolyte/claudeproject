import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Page, ProjectSummary } from '@neo/contracts'
import { useResource } from '../../lib/useResource'
import { Feedback, Field, Pager } from '../../components/ui/Feedback'

export function LandingPage() { return <ExplorePage /> }
export function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const [form, setForm] = useState({ q: params.get('q') ?? '', location: params.get('location') ?? '', skill: params.get('skill') ?? '', sector: params.get('sector') ?? '', stage: params.get('stage') ?? '' })
  const query = new URLSearchParams(params)
  query.set('limit', '20')
  const resource = useResource<Page<ProjectSummary>>(`/discover/projects?${query}`)
  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }))
  function filter(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(form)) if (value.trim()) next.set(key, value.trim())
    setParams(next)
  }
  return <section className="neo-discovery">
    <div className="hero"><h1>Discover what the North East is building.</h1><p>Find a project worth joining, or the people who can help build yours.</p></div>
    <form onSubmit={filter} className="card pad neo-discovery-form">
      <Field label="Search projects"><input value={form.q} maxLength={300} onChange={e => set('q', e.target.value)} placeholder="Search titles and pitches" /></Field>
      <div className="filters"><Field label="Location"><input value={form.location} maxLength={120} onChange={e => set('location', e.target.value)} placeholder="e.g. Newcastle" /></Field><Field label="Required skill"><input value={form.skill} maxLength={60} onChange={e => set('skill', e.target.value)} placeholder="e.g. React" /></Field><Field label="Sector"><input value={form.sector} maxLength={120} onChange={e => set('sector', e.target.value)} placeholder="e.g. Climate" /></Field><Field label="Stage"><select value={form.stage} onChange={e => set('stage', e.target.value)}><option value="">All stages</option>{['idea', 'prototype', 'mvp', 'launched'].map(value => <option key={value}>{value}</option>)}</select></Field></div>
      <div className="row gap-sm wrap"><button className="btn btn-primary">Find projects</button><button type="button" className="btn btn-secondary" onClick={() => { setForm({ q: '', location: '', skill: '', sector: '', stage: '' }); setParams({}) }}>Clear filters</button></div>
    </form>
    <Feedback loading={resource.loading} error={resource.error} retry={resource.refresh} />
    {resource.data && <>{resource.data.data.length === 0 ? <p className="empty">No published projects match these filters yet.</p> : <div className="grid">{resource.data.data.map(project => <article className="card pad neo-project-card" key={project.id}><div className="row gap-sm wrap"><span className="chip">{project.stage}</span><span className="chip">{project.status}</span></div><h2><Link to={`/projects/${project.id}`}>{project.title}</Link></h2><p>{project.pitch}</p><p className="small muted">{project.location} · {project.sector} · {project.ownerDisplayName}</p><div className="row gap-sm wrap">{project.requiredSkills.map(skill => <span key={skill} className="skill">{skill}</span>)}</div><p className="small muted">{project.openNeedsCount} open {project.openNeedsCount === 1 ? 'opportunity' : 'opportunities'}</p><p className="small muted">{project.lastSubstantiveUpdateAt ? `Last progress: ${new Date(project.lastSubstantiveUpdateAt).toLocaleDateString('en-GB')}` : 'No progress update yet.'}</p></article>)}</div>}<Pager pagination={resource.data.pagination} onPage={offset => { const next = new URLSearchParams(params); next.set('offset', String(offset)); setParams(next) }} /></>}
  </section>
}
