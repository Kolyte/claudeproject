import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ActivityProps, Page, ProjectPost, Milestone, PostType } from '@neo/contracts'
import { useResource } from '../../lib/useResource'
import { save, message } from '../../lib/api'
import { Feedback, Field, Pager } from '../../components/ui/Feedback'

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export function ProjectActivity({ projectId, canManage }: ActivityProps) {
  const [postOffset, setPostOffset] = useState(0)
  const [milestoneOffset, setMilestoneOffset] = useState(0)
  const posts = useResource<Page<ProjectPost>>(`/projects/${projectId}/posts?limit=20&offset=${postOffset}`)
  const milestones = useResource<Page<Milestone>>(`/projects/${projectId}/milestones?limit=20&offset=${milestoneOffset}`)
  const [type, setType] = useState<PostType>('progress')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [achievedAt, setAchievedAt] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [notice, setNotice] = useState('')
  async function submit(event: FormEvent, milestone: boolean) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      await save(`/projects/${projectId}/${milestone ? 'milestones' : 'posts'}`, milestone ? { title, description, achievedAt: new Date(`${achievedAt}T12:00:00Z`).toISOString(), evidenceUrl: evidenceUrl.trim() || null } : { type, body })
      if (milestone) { setTitle(''); setDescription(''); setEvidenceUrl(''); milestones.refresh() } else { setBody(''); posts.refresh() }
      setNotice(milestone ? 'Milestone published.' : 'Update published.')
    } catch (error) { setError(message(error)) } finally { setBusy(false) }
  }
  return <div className="col-main neo-activity">
    <section className="card pad"><h2>Progress</h2><Feedback loading={posts.loading} error={posts.error} retry={posts.refresh} />
      {posts.data && <>{posts.data.data.length === 0 && <p className="muted">No progress update yet.</p>}<ol className="timeline">{posts.data.data.map(post => <li className="post" key={post.id}><div><div className="post-meta"><strong>{post.type}</strong><time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time></div><p className="neo-prose">{post.body}</p></div></li>)}</ol><Pager pagination={posts.data.pagination} onPage={setPostOffset} /></>}
    </section>
    <section className="card pad"><h2>Milestones</h2><Feedback loading={milestones.loading} error={milestones.error} retry={milestones.refresh} />
      {milestones.data && <>{milestones.data.data.length === 0 && <p className="muted">No milestones yet.</p>}<ol className="timeline">{milestones.data.data.map(milestone => <li key={milestone.id}><h3>{milestone.title}</h3><span className="tag tag-reported">Founder reported</span> <time dateTime={milestone.achievedAt}>{formatDate(milestone.achievedAt)}</time><p className="neo-prose">{milestone.description}</p>{milestone.evidenceUrl && <a href={milestone.evidenceUrl} rel="noopener noreferrer" target="_blank">Evidence link</a>}</li>)}</ol><Pager pagination={milestones.data.pagination} onPage={setMilestoneOffset} /></>}
    </section>
    {canManage && <section className="card pad"><h2>Add progress</h2><form className="neo-form" onSubmit={e => submit(e, false)}><Field label="Update type"><select value={type} onChange={e => setType(e.target.value as PostType)}>{['progress', 'milestone', 'roadblock', 'opportunity', 'announcement'].map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Update"><textarea required maxLength={5000} value={body} onChange={e => setBody(e.target.value)} /></Field><button className="btn btn-primary" disabled={busy}>Publish update</button></form>
      <h2 className="neo-section-title">Record a milestone</h2><form className="neo-form" onSubmit={e => submit(e, true)}><Field label="Milestone title"><input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></Field><Field label="Milestone description"><textarea required maxLength={5000} value={description} onChange={e => setDescription(e.target.value)} /></Field><Field label="Date achieved"><input required type="date" value={achievedAt} onChange={e => setAchievedAt(e.target.value)} /></Field><Field label="Evidence URL (optional)"><input type="url" maxLength={2048} pattern="https?://.*" value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} /></Field><p className="small muted">Milestones are self-reported. A link does not provide independent verification.</p><button className="btn btn-primary" disabled={busy}>Publish milestone</button></form>
      <Feedback error={error} />{notice && <p role="status">{notice}</p>}
    </section>}
  </div>
}
