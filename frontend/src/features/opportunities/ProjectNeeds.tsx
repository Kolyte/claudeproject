import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  type ApiRequestError,
  applyToNeed,
  createNeed,
  hasSession,
  listMyApplications,
  listNeeds,
  updateNeed,
} from './api';
import {
  applicationStatusLabels,
  compensationLabels,
  needStatusLabels,
  participationLabels,
  workModeLabels,
} from './labels';
import NeedForm from './NeedForm';
import { ErrorNotice, Loading, SignInLink } from './StateViews';
import type { ApplicationStatus, Need, NeedStatus, ProjectNeedsProps } from './types';
import { usePagedList } from './usePagedList';
import './opportunities.css';

const STATUS_ORDER: Record<NeedStatus, number> = { open: 0, reviewing: 1, filled: 2, closed: 3 };
const MY_APPLICATIONS_LIMIT = 50;

function ApplyPanel({
  need,
  signedIn,
  onApplied,
}: {
  need: Need;
  signedIn: boolean;
  onApplied: (status: ApplicationStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);

  if (!signedIn) return <SignInLink>Sign in to apply</SignInLink>;
  if (!open) {
    return (
      <button type="button" className="btn btn-secondary btn-sm op-self-start" onClick={() => setOpen(true)}>
        Apply
      </button>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const application = await applyToNeed(need.id, message);
      onApplied(application.status);
    } catch (caught) {
      const failure = caught as ApiRequestError;
      if (failure.status === 409 && /already applied/i.test(failure.message)) {
        onApplied('submitted');
        return;
      }
      setError(failure);
      setSaving(false);
    }
  }

  return (
    <form className="op-form" onSubmit={submit}>
      <label className="field" htmlFor={`apply-${need.id}`}>
        Why are you a good fit? What could you start with?
        <textarea
          id={`apply-${need.id}`}
          required
          maxLength={5000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>
      {error && <ErrorNotice error={error} />}
      <div className="op-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !message.trim()}>
          {saving ? 'Sending…' : 'Send application'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function NeedCard({
  need,
  canManage,
  signedIn,
  applicationStatus,
  onApplied,
  onChanged,
}: {
  need: Need;
  canManage: boolean;
  signedIn: boolean;
  applicationStatus?: ApplicationStatus;
  onApplied: (needId: string, status: ApplicationStatus) => void;
  onChanged: (need: Need) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [statusError, setStatusError] = useState<ApiRequestError | null>(null);

  if (editing) {
    return (
      <div className="need">
        <NeedForm
          initial={need}
          submitLabel="Save role"
          onCancel={() => setEditing(false)}
          onSubmit={async (fields) => {
            const { title, description, requiredSkills, desirableSkills, participationType } = fields;
            const { hoursPerWeek, workMode, location, compensation } = fields;
            onChanged(
              await updateNeed(need.id, {
                title,
                description,
                requiredSkills,
                desirableSkills,
                participationType,
                hoursPerWeek,
                workMode,
                location,
                compensation,
              }),
            );
            setEditing(false);
          }}
        />
      </div>
    );
  }

  async function changeStatus(status: NeedStatus) {
    setStatusError(null);
    try {
      onChanged(await updateNeed(need.id, { status }));
    } catch (caught) {
      setStatusError(caught as ApiRequestError);
    }
  }

  return (
    <div className="need">
      <div className="op-need-head">
        <div className="need-title">{need.title}</div>
        {need.status !== 'open' && <span className="badge badge-grey">{needStatusLabels[need.status]}</span>}
      </div>
      <p className="small op-prose">{need.description}</p>
      {need.requiredSkills.length + need.desirableSkills.length > 0 && (
        <div className="row gap-sm wrap">
          {need.requiredSkills.map((skill) => (
            <span key={skill} className="skill skill-req">
              {skill}
            </span>
          ))}
          {need.desirableSkills.map((skill) => (
            <span key={skill} className="skill">
              {skill}
            </span>
          ))}
        </div>
      )}
      <div className="small muted">
        {participationLabels[need.participationType]} · {need.hoursPerWeek}h/week · {workModeLabels[need.workMode]} ·{' '}
        {need.location} · {compensationLabels[need.compensation]}
      </div>

      {canManage ? (
        <div className="op-actions">
          <label className="op-inline-select small">
            Status
            <select
              value={need.status}
              onChange={(event) => void changeStatus(event.target.value as NeedStatus)}
              aria-label={`Status of ${need.title}`}
            >
              {(Object.keys(needStatusLabels) as NeedStatus[]).map((status) => (
                <option key={status} value={status}>
                  {needStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      ) : applicationStatus ? (
        <div className="applied">Your application: {applicationStatusLabels[applicationStatus]}</div>
      ) : need.status === 'open' ? (
        <ApplyPanel
          need={need}
          signedIn={signedIn}
          onApplied={(status) => onApplied(need.id, status)}
        />
      ) : (
        <p className="small muted">Not accepting applications.</p>
      )}
      {statusError && <ErrorNotice error={statusError} />}
    </div>
  );
}

export default function ProjectNeeds({ projectId, canManage }: ProjectNeedsProps) {
  const load = useCallback((offset: number) => listNeeds(projectId, offset), [projectId]);
  const { items, setItems, total, loading, loadingMore, error, reload, loadMore } = usePagedList(load);
  const [adding, setAdding] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [myApplications, setMyApplications] = useState<Record<string, ApplicationStatus>>({});

  useEffect(() => {
    let active = true;
    void (async () => {
      const session = await hasSession();
      if (!active) return;
      setSignedIn(session);
      if (!session || canManage) return;
      try {
        const { data } = await listMyApplications(0, MY_APPLICATIONS_LIMIT);
        if (active) setMyApplications(Object.fromEntries(data.map((row) => [row.needId, row.status])));
      } catch {
        // Only an enhancement: a duplicate apply is still rejected by the server.
      }
    })();
    return () => {
      active = false;
    };
  }, [canManage]);

  const replaceNeed = (updated: Need) =>
    setItems((previous) => previous.map((need) => (need.id === updated.id ? updated : need)));
  const needs = [...items].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return (
    <section className="card pad op-needs" aria-labelledby={`needs-${projectId}`}>
      <div className="op-section-head">
        <h3 id={`needs-${projectId}`}>Open roles</h3>
        {canManage && (
          <div className="op-actions">
            <Link className="btn btn-ghost btn-sm" to={`/projects/${projectId}/applications`}>
              Review applications
            </Link>
            {!adding && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}>
                Add a role
              </button>
            )}
          </div>
        )}
      </div>

      {adding && (
        <div className="need">
          <NeedForm
            submitLabel="Publish role"
            onCancel={() => setAdding(false)}
            onSubmit={async (fields) => {
              const created = await createNeed(projectId, fields);
              setItems((previous) => [created, ...previous]);
              setAdding(false);
            }}
          />
        </div>
      )}

      {loading ? (
        <Loading label="Loading roles…" />
      ) : error && items.length === 0 ? (
        <ErrorNotice error={error} onRetry={() => void reload()} />
      ) : needs.length === 0 && !adding ? (
        <p className="muted small">
          {canManage ? 'Add a role to tell people how they can help.' : 'No open roles right now.'}
        </p>
      ) : (
        needs.map((need) => (
          <NeedCard
            key={need.id}
            need={need}
            canManage={canManage}
            signedIn={signedIn}
            applicationStatus={myApplications[need.id]}
            onApplied={(needId, status) => setMyApplications((previous) => ({ ...previous, [needId]: status }))}
            onChanged={replaceNeed}
          />
        ))
      )}

      {!loading && items.length > 0 && items.length < total && (
        <button
          type="button"
          className="btn btn-ghost btn-sm op-self-start"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? 'Loading…' : 'Show more roles'}
        </button>
      )}
    </section>
  );
}
