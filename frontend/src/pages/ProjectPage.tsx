import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ActivityBadge from '../components/ActivityBadge';
import { activityLabel, formatDate, initials, lastSubstantiveUpdate, relativeDate } from '../lib/activity';
import { useProjects } from '../state/ProjectsContext';
import type { PostType, ProjectNeed } from '../../types';

const postIcon: Record<PostType, string> = {
  'Progress update': '↗',
  Milestone: '★',
  Roadblock: '⚠',
  Opportunity: '✋',
  Announcement: '📣',
};

export default function ProjectPage() {
  const { slug } = useParams();
  const { projects, followed, toggleFollow } = useProjects();
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    return (
      <div className="empty">
        <p>That project does not exist.</p>
        <Link to="/">Back to Explore</Link>
      </div>
    );
  }

  const isFollowing = followed.includes(project.slug);
  const last = lastSubstantiveUpdate(project);
  const people = Object.fromEntries(project.team.map((t) => [t.person.id, t.person]));
  const posts = [...project.posts].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <article className="project-page">
      <div className="project-cover" style={{ background: project.accent }} />

      <header className="project-header">
        <div>
          <div className="row gap-sm wrap">
            <span className="chip">{project.sector}</span>
            <span className="chip">{project.stage}</span>
            <span className="chip chip-muted">📍 {project.location}</span>
          </div>
          <h1>{project.title}</h1>
          <p className="lead">{project.tagline}</p>
        </div>
        <div className="header-actions">
          <button className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'} onClick={() => toggleFollow(project.slug)}>
            {isFollowing ? '✓ Following' : '+ Follow'}
          </button>
          <span className="muted small">{project.followers + (isFollowing ? 1 : 0)} followers</span>
        </div>
      </header>

      <div className="two-col">
        <div className="col-main">
          <section className="card pad">
            <h2>The problem</h2>
            <p>{project.problem}</p>
            <h2>The idea</h2>
            <p>{project.solution}</p>
          </section>

          <section>
            <h2 className="section-title">Timeline</h2>
            {posts.length === 0 && <p className="muted">No updates yet.</p>}
            <ol className="timeline">
              {posts.map((post) => (
                <li key={post.id} className={`post post-${post.type.split(' ')[0].toLowerCase()}`}>
                  <div className="post-icon">{postIcon[post.type]}</div>
                  <div className="post-body">
                    <div className="post-meta">
                      <strong>{post.type}</strong>
                      <span className="muted">· {people[post.authorId]?.name ?? 'Team member'} · {formatDate(post.date)}</span>
                    </div>
                    <p>{post.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="col-side">
          <section className="card pad">
            <h3>Activity</h3>
            <div className="row gap-sm">
              <ActivityBadge label={project.status === 'Active' ? activityLabel(project) : project.status} />
              <span className="muted small">Status: {project.status}</span>
            </div>
            <p className="small">
              Last substantive update: <strong>{last ? relativeDate(last) : 'none yet'}</strong>
            </p>
            <p className="hint">Activity shows how recently the team posted. It is not a measure of quality or traction.</p>
          </section>

          <section className="card pad">
            <h3>Open roles</h3>
            {project.needs.filter((n) => n.status === 'Open').length === 0 && <p className="muted small">No open roles right now.</p>}
            {project.needs
              .filter((n) => n.status === 'Open')
              .map((need) => (
                <NeedItem key={need.id} need={need} />
              ))}
          </section>

          <section className="card pad">
            <h3>Team</h3>
            {project.team.map(({ person, role }) => (
              <div key={person.id} className="person">
                <div className="avatar">{initials(person.name)}</div>
                <div>
                  <div className="person-name">{person.name}</div>
                  <div className="muted small">{role}</div>
                </div>
              </div>
            ))}
          </section>

          <section className="card pad">
            <h3>Milestones</h3>
            {project.milestones.length === 0 && <p className="muted small">No milestones yet.</p>}
            <ul className="milestones">
              {project.milestones.map((m) => (
                <li key={m.id}>
                  <div className="milestone-title">{m.title}</div>
                  <div className="row gap-sm wrap small">
                    <span className="muted">{formatDate(m.date)}</span>
                    {m.verified ? (
                      <span className="tag tag-verified">✓ Verified evidence</span>
                    ) : (
                      <span className="tag tag-reported">Founder-reported</span>
                    )}
                    {m.evidenceUrl && <a href={m.evidenceUrl} target="_blank" rel="noreferrer">evidence</a>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </article>
  );
}

function NeedItem({ need }: { need: ProjectNeed }) {
  const { applied, apply } = useProjects();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const hasApplied = applied.includes(need.id);

  return (
    <div className="need">
      <div className="need-title">{need.title}</div>
      <p className="small">{need.description}</p>
      <div className="row gap-sm wrap">
        {need.requiredSkills.map((s) => <span key={s} className="skill skill-req">{s}</span>)}
        {need.desirableSkills.map((s) => <span key={s} className="skill">{s}</span>)}
      </div>
      <div className="need-meta small muted">
        {need.workType} · {need.hoursPerWeek}h/week · {need.workMode} · {need.compensation}
      </div>

      {hasApplied ? (
        <div className="applied">✓ Application sent (demo)</div>
      ) : open ? (
        <form
          className="apply-form"
          onSubmit={(e) => {
            e.preventDefault();
            apply(need.id);
            setOpen(false);
          }}
        >
          <textarea
            required
            placeholder="Why are you a good fit? What could you start with?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="row gap-sm">
            <button className="btn btn-primary btn-sm" type="submit">Send application</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>Apply for this role</button>
      )}
    </div>
  );
}
