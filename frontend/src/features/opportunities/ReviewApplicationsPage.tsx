import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { type ApiRequestError, listNeeds, listProjectApplications, updateApplicationStatus } from './api';
import { applicationBadge, applicationStatusLabels, formatDate } from './labels';
import { ErrorNotice, Loading } from './StateViews';
import type { ApplicationReview, ApplicationStatus } from './types';
import { usePagedList } from './usePagedList';
import './opportunities.css';

const ACTIONS: Partial<Record<ApplicationStatus, { status: ApplicationStatus; label: string; primary?: boolean }[]>> = {
  submitted: [
    { status: 'reviewing', label: 'Start review' },
    { status: 'accepted', label: 'Accept', primary: true },
    { status: 'rejected', label: 'Decline' },
  ],
  reviewing: [
    { status: 'accepted', label: 'Accept', primary: true },
    { status: 'rejected', label: 'Decline' },
  ],
};

function ReviewCard({
  application,
  needTitle,
  onChange,
}: {
  application: ApplicationReview;
  needTitle: string;
  onChange: (id: string, status: ApplicationStatus, updatedAt: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);
  const { applicant } = application;

  async function setStatus(status: ApplicationStatus) {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateApplicationStatus(application.id, status);
      onChange(updated.id, updated.status, updated.updatedAt);
    } catch (caught) {
      setError(caught as ApiRequestError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="card pad op-stack">
      <div className="op-need-head">
        <div>
          <div className="need-title">{applicant.displayName}</div>
          <div className="small muted">
            {needTitle} · Applied {formatDate(application.createdAt)}
            {applicant.hoursPerWeek !== null && ` · ${applicant.hoursPerWeek}h/week available`}
          </div>
        </div>
        <span className={`badge ${applicationBadge[application.status]}`}>
          {applicationStatusLabels[application.status]}
        </span>
      </div>
      {applicant.declaredSkills.length > 0 && (
        <div className="row gap-sm wrap" aria-label="Declared skills">
          {applicant.declaredSkills.map((skill) => (
            <span key={skill} className="skill">
              {skill}
            </span>
          ))}
        </div>
      )}
      <p className="small op-prose">{application.message}</p>
      {ACTIONS[application.status] && (
        <div className="op-actions">
          {ACTIONS[application.status]?.map(({ status, label, primary }) => (
            <button
              key={status}
              type="button"
              className={`btn btn-sm ${primary ? 'btn-primary' : 'btn-secondary'}`}
              disabled={busy}
              onClick={() => void setStatus(status)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {error && <ErrorNotice error={error} />}
    </li>
  );
}

export default function ReviewApplicationsPage() {
  const { projectId = '' } = useParams();
  const load = useCallback((offset: number) => listProjectApplications(projectId, offset), [projectId]);
  const { items, setItems, total, loading, loadingMore, error, reload, loadMore } = usePagedList(load);
  const [needTitles, setNeedTitles] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let active = true;
    listNeeds(projectId, 0)
      .then(({ data }) => {
        if (active) setNeedTitles(new Map(data.map((need) => [need.id, need.title])));
      })
      .catch(() => {
        // Titles are a convenience; the review itself still works without them.
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const counts = useMemo(() => items.filter((row) => row.status === 'submitted').length, [items]);

  return (
    <div className="op-page">
      <Link className="small" to={`/projects/${projectId}`}>
        ← Back to project
      </Link>
      <h1 className="page-title">Review applications</h1>
      {!loading && !error && items.length > 0 && (
        <p className="muted small">
          {total} {total === 1 ? 'application' : 'applications'}, {counts} new on this page. Accepting records your
          decision; it does not grant project access or promise equity.
        </p>
      )}

      {loading ? (
        <Loading label="Loading applications…" />
      ) : error && items.length === 0 ? (
        <ErrorNotice error={error} onRetry={() => void reload()} />
      ) : items.length === 0 ? (
        <div className="empty">
          <p>No applications yet.</p>
        </div>
      ) : (
        <ul className="op-list">
          {items.map((application) => (
            <ReviewCard
              key={application.id}
              application={application}
              needTitle={needTitles.get(application.needId) ?? 'Role'}
              onChange={(id, status, updatedAt) =>
                setItems((previous) =>
                  previous.map((row) => (row.id === id ? { ...row, status, updatedAt } : row)),
                )
              }
            />
          ))}
        </ul>
      )}

      {!loading && items.length > 0 && items.length < total && (
        <button
          type="button"
          className="btn btn-secondary btn-sm op-self-start"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? 'Loading…' : 'Show more'}
        </button>
      )}
    </div>
  );
}
