import { Link } from 'react-router-dom';
import { formatUpdate, stageLabel } from './filters.ts';
import type { ProjectSummary } from './types.ts';

/** `headingLevel` keeps the outline valid: 2 directly under the page h1 (Explore), 3 under a section h2 (Landing). */
export default function DiscoveryCard({ project, headingLevel = 3 }: { project: ProjectSummary; headingLevel?: 2 | 3 }) {
  const Title = headingLevel === 2 ? 'h2' : 'h3';
  const skills = project.requiredSkills.slice(0, 4);
  const extraSkills = project.requiredSkills.length - skills.length;

  return (
    <Link to={`/projects/${encodeURIComponent(project.id)}`} className="card disc-card">
      <div className="disc-card-body">
        <div className="row gap-sm wrap">
          <span className="chip">{stageLabel(project.stage)}</span>
          <span className="chip">{project.sector}</span>
          {project.status !== 'active' && (
            <span className={`badge ${project.status === 'completed' ? 'badge-blue' : 'badge-grey'}`}>
              {project.status === 'completed' ? 'Completed' : 'Paused'}
            </span>
          )}
        </div>
        <Title className="disc-card-title">{project.title}</Title>
        <p className="disc-card-pitch">{project.pitch}</p>
        <p className="small muted disc-card-meta">
          <span aria-label="Location">📍 {project.location}</span> · by {project.ownerDisplayName}
        </p>

        {project.openNeedsCount > 0 ? (
          <div className="disc-card-needs">
            <span className="disc-label">
              {project.openNeedsCount} open {project.openNeedsCount === 1 ? 'role' : 'roles'}
            </span>
            {skills.map((s) => (
              <span key={s} className="need-pill">{s}</span>
            ))}
            {extraSkills > 0 && <span className="small muted">+{extraSkills} more</span>}
          </div>
        ) : (
          <p className="small muted">No open roles right now</p>
        )}
      </div>
      <div className="disc-card-foot small muted">{formatUpdate(project.lastSubstantiveUpdateAt)}</div>
    </Link>
  );
}
