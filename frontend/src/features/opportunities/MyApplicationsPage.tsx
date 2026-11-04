import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { type ApiRequestError, listMyApplications, updateApplicationStatus } from './api';
import { applicationBadge, applicationStatusLabels, formatDate } from './labels';
import { ErrorNotice, Loading } from './StateViews';
import type { ApplicationStatus } from './types';
import { usePagedList } from './usePagedList';
import './opportunities.css';

const WITHDRAWABLE: readonly ApplicationStatus[] = ['submitted', 'reviewing'];

export default function MyApplicationsPage() {
  const load = useCallback((offset: number) => listMyApplications(offset), []);
  const { items, setItems, total, loading, loadingMore, error, reload, loadMore } = usePagedList(load);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiRequestError | null>(null);

  async function withdraw(applicationId: string) {
    setBusyId(applicationId);
    setActionError(null);
    try {
      const updated = await updateApplicationStatus(applicationId, 'withdrawn');
      setItems((previous) =>
        previous.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
      );
    } catch (caught) {
      setActionError(caught as ApiRequestError);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="op-page">
      <h1 className="page-title">My applications</h1>
      {actionError && <ErrorNotice error={actionError} />}

      {loading ? (
        <Loading label="Loading your applications…" />
      ) : error && items.length === 0 ? (
        <ErrorNotice error={error} onRetry={() => void reload()} />
      ) : items.length === 0 ? (
        <div className="empty">
          <p>You have not applied to any roles yet.</p>
          <Link to="/explore">Explore projects</Link>
        </div>
      ) : (
        <ul className="op-list">
          {items.map((application) => (
            <li key={application.id} className="card pad op-stack">
              <div className="op-need-head">
                <div className="need-title">Applied {formatDate(application.createdAt)}</div>
                <span className={`badge ${applicationBadge[application.status]}`}>
                  {applicationStatusLabels[application.status]}
                </span>
              </div>
              <p className="small op-prose">{application.message}</p>
              {WITHDRAWABLE.includes(application.status) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm op-self-start"
                  disabled={busyId === application.id}
                  onClick={() => void withdraw(application.id)}
                >
                  {busyId === application.id ? 'Withdrawing…' : 'Withdraw application'}
                </button>
              )}
            </li>
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
