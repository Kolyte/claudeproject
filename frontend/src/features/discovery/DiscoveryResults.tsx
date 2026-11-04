import type { ReactNode } from 'react';
import DiscoveryCard from './DiscoveryCard.tsx';
import type { DiscoveryState } from './useDiscovery.ts';

interface Props {
  state: DiscoveryState;
  onRetry: () => void;
  empty: ReactNode;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  moreError?: string | null;
  skeletonCount?: number;
  /** Serialised filters this state belongs to; exposed for tests and debugging. */
  queryKey?: string;
  /** Heading level for card titles; see DiscoveryCard. */
  cardHeadingLevel?: 2 | 3;
}

/** Renders loading, error, empty and result states for a discovery query. */
export default function DiscoveryResults(props: Props) {
  return (
    <div data-discovery-status={props.state.status} data-discovery-query={props.queryKey ?? ''}>
      <ResultsBody {...props} />
    </div>
  );
}

function ResultsBody({ state, onRetry, empty, onLoadMore, loadingMore, moreError, skeletonCount = 6, cardHeadingLevel = 3 }: Props) {
  if (state.status === 'loading') {
    return (
      <div className="grid disc-grid" aria-busy="true" aria-label="Loading projects">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div key={i} className="card disc-skeleton" aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="disc-state" role="alert">
        <p><strong>Projects could not be loaded.</strong></p>
        <p className="muted">{state.message}</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>Try again</button>
      </div>
    );
  }

  if (state.items.length === 0) return <div className="disc-state">{empty}</div>;

  const remaining = state.total - state.items.length;
  return (
    <>
      <div className="grid disc-grid" data-testid="discovery-results">
        {state.items.map((p) => (
          <DiscoveryCard key={p.id} project={p} headingLevel={cardHeadingLevel} />
        ))}
      </div>
      {onLoadMore && remaining > 0 && (
        <div className="disc-more">
          {moreError && <p className="small" role="alert">{moreError}</p>}
          <button type="button" className="btn btn-secondary" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : moreError ? 'Retry loading more' : `Show more (${remaining} left)`}
          </button>
        </div>
      )}
    </>
  );
}
