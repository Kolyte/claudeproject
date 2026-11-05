import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Page, ProjectSummary } from '@neo/contracts'
import { api, message } from '../../lib/api'
import { locateProject, projectPoint } from './ProjectMap.locations'
import './ProjectMap.css'

const coast = [[-2.04,55.80],[-1.94,55.69],[-1.79,55.63],[-1.64,55.57],[-1.63,55.46],[-1.56,55.34],[-1.52,55.22],[-1.48,55.12],[-1.42,55.03],[-1.36,54.96],[-1.34,54.87],[-1.30,54.77],[-1.18,54.69],[-1.17,54.64],[-1.07,54.63],[-0.94,54.57]]
const line = coast.map(([lon, lat]) => { const p = projectPoint(lon, lat); return `${p.x},${p.y}` }).join(' ')
const labels = [['Berwick',-2,55.77],['Northumberland',-2.3,55.38],['Newcastle',-1.61,54.98],['Sunderland',-1.38,54.91],['Durham',-1.58,54.78],['Teesside',-1.24,54.57]] as const

export function ProjectMap() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true); setError('')
      try {
        const all = new Map<string, ProjectSummary>()
        for (let offset = 0; ; offset += 50) {
          const page = await api<Page<ProjectSummary>>(`/discover/projects?limit=50&offset=${offset}`, { signal: controller.signal })
          page.data.forEach(project => all.set(project.id, project))
          if (offset + page.data.length >= page.pagination.total || page.data.length === 0) break
        }
        if (!controller.signal.aborted) { setProjects([...all.values()]); setSelectedId('') }
      } catch (err) { if (!controller.signal.aborted) setError(message(err)) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [attempt])
  const selected = projects.find(project => project.id === selectedId)
  const mapped = projects.flatMap(project => {
    const point = locateProject(project.location)
    return point ? [{ project, point }] : []
  })
  // Group co-located projects instead of moving their dots into another town.
  const groups = new Map<string, { x: number; y: number; projects: ProjectSummary[] }>()
  for (const item of mapped) {
    const key = `${item.point.x},${item.point.y}`
    const group = groups.get(key) ?? { ...item.point, projects: [] }
    group.projects.push(item.project)
    groups.set(key, group)
  }
  return <section className="neo-map" aria-labelledby="neo-map-title">
    <header className="neo-map-heading"><div><p className="neo-map-eyebrow">The region / Project atlas</p><h2 id="neo-map-title">Ideas taking shape, near you.</h2></div><Link to="/explore">Explore all projects →</Link></header>
    <p id="neo-map-help">Select a dot or choose a project below. Positions show approximate declared towns or areas. Numbered dots group projects in the same area; select again to cycle through them.</p>
    {loading ? <p role="status">Loading the region’s projects…</p> : error ? <div role="alert"><p>{error}</p><button className="btn btn-secondary" onClick={() => setAttempt(value => value + 1)}>Retry project map</button></div> : <>
      <div className="neo-map-workspace">
        <div className="neo-map-canvas" aria-label="North East England project map" aria-describedby="neo-map-help">
          <svg viewBox="0 0 480 480" aria-hidden="true" focusable="false"><defs><pattern id="neo-map-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth=".5" /></pattern></defs><rect width="480" height="480" fill="url(#neo-map-grid)" className="neo-map-grid" />
            <polygon points={`0,0 ${line} 340,480 0,480`} className="neo-map-land" /><polyline points={line} className="neo-map-coast" />
            <text x="370" y="190" className="neo-map-sea">NORTH SEA</text><text x="24" y="28" className="neo-map-sea">N ↑</text>
            {labels.map(([name,lon,lat]) => { const p=projectPoint(lon,lat); return <text key={name} x={p.x - 16} y={p.y + 25} className="neo-map-label">{name}</text> })}
          </svg>
          {[...groups.entries()].map(([key, { projects: local, x, y }]) => <button key={key} className="neo-map-dot" style={{ left: `${x/4.8}%`, top: `${y/4.8}%` }} aria-label={local.length === 1 ? `${local[0].title}, ${local[0].location}` : `${local[0].location}, ${local.length} projects. Select to cycle projects.`} aria-pressed={local.some(project => selectedId === project.id)} onClick={() => { const index = local.findIndex(project => project.id === selectedId); setSelectedId(local[(index + 1) % local.length].id) }} title={`${local[0].location} · ${local.length} ${local.length === 1 ? 'project' : 'projects'}`}><span />{local.length > 1 && <b>{local.length}</b>}</button>)}
          <span className="neo-map-key"><i /> Published project</span>
        </div>
        <div className="neo-map-ticket" aria-live="polite" aria-atomic="true">
          <p className="neo-map-band">North East Origins / {selected ? 'Selected project' : 'Local connections'}</p>
          <div className="neo-map-detail">{selected ? <><p className="neo-map-eyebrow">{selected.sector}</p><h3>{selected.title}</h3><p>{selected.pitch}</p><dl><div><dt>Area</dt><dd>{selected.location}</dd></div><div><dt>Stage</dt><dd>{selected.stage}</dd></div><div><dt>Status</dt><dd>{selected.status}</dd></div><div><dt>Open opportunities</dt><dd>{selected.openNeedsCount}</dd></div></dl>{!locateProject(selected.location) && <p>Location is not mapped. See the project for its declared area.</p>}<Link className="btn btn-primary" to={`/projects/${selected.id}`}>View project →</Link></> : <><h3>Find your people.<br />Build something here.</h3><p>{projects.length ? `${projects.length} published projects. ${mapped.length} with a recognised North East location.` : 'No projects have been published yet.'}</p><p>Choose a project to see what they are building and where you could help.</p><Link to="/projects/new">Share your project →</Link></>}</div>
        </div>
      </div>
      {projects.length > 0 && <details className="neo-map-list" open><summary>Choose a project ({projects.length})</summary><ul>{projects.map(project => <li key={project.id}><button aria-pressed={selectedId === project.id} onClick={() => setSelectedId(project.id)}>{project.title}<span>{project.location}{!locateProject(project.location) ? ' · Not mapped' : ''}</span></button></li>)}</ul></details>}
    </>}
  </section>
}
