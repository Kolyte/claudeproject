import { Link, useLocation } from 'react-router-dom';
import type { ApiRequestError } from './api';

export function Loading({ label }: { label: string }) {
  return (
    <p className="op-state muted small" role="status">
      {label}
    </p>
  );
}

export function SignInLink({ children }: { children: string }) {
  const location = useLocation();
  const destination = `${location.pathname}${location.search}${location.hash}`;
  return (
    <Link
      className="btn btn-secondary btn-sm"
      to={`/login?next=${encodeURIComponent(destination)}`}
      state={{ from: destination }}
    >
      {children}
    </Link>
  );
}

export function ErrorNotice({ error, onRetry }: { error: ApiRequestError; onRetry?: () => void }) {
  if (error.status === 401) {
    return (
      <div className="op-state op-stack">
        <p className="muted small">Sign in to see this page.</p>
        <SignInLink>Sign in</SignInLink>
      </div>
    );
  }
  return (
    <div className="op-error" role="alert">
      <span>{error.message}</span>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
