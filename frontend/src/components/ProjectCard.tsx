import { Link } from 'react-router-dom';
import type { Project } from '../../types';
import { activityLabel, lastSubstantiveUpdate, relativeDate } from '../lib/activity';
import ActivityBadge from './ActivityBadge';

export default function ProjectCard({ project }: { project: Project }) {
  const last = lastSubstantiveUpdate(project);
  const openNeeds = project.needs.filter((n) => n.status === 'Open');

  return (
    <Link to={`/projects/${project.slug}`} className="card project-card">
      <div className="cover" style={{ background: project.accent }}>
        <span className="cover-title">{project.title}</span>
      </div>
      <div className="card-body">
        <div className="row gap-sm wrap">
          <span className="chip">{project.sector}</span>
          <span className="chip">{project.stage}</span>
          <span className="chip chip-muted">📍 {project.location}</span>
        </div>
        <p className="tagline">{project.tagline}</p>

        {openNeeds.length > 0 && (
          <div className="needs-preview">
            <span className="label">Looking for</span>
            {openNeeds.slice(0, 2).map((n) => (
              <span key={n.id} className="need-pill">{n.title}</span>
            ))}
          </div>
        )}

        <div className="card-foot">
          <ActivityBadge label={project.status === 'Active' ? activityLabel(project) : project.status} />
          <span className="muted small">{last ? `Updated ${relativeDate(last)}` : 'No updates yet'}</span>
        </div>
      </div>
    </Link>
  );
}
