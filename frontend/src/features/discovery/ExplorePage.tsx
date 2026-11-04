import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DiscoveryResults from './DiscoveryResults.tsx';
import FixtureNotice from './FixtureNotice.tsx';
import SectorInput from './SectorInput.tsx';
import {
  FILTER_KEYS,
  NORTH_EAST_LOCATIONS,
  STAGES,
  filtersFromParams,
  hasActiveFilters,
  toQueryString,
  type FilterKey,
} from './filters.ts';
import { useDiscovery } from './useDiscovery.ts';
import './discovery.css';

const TEXT_DEBOUNCE_MS = 300;

export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const { state, loadMore, loadingMore, moreError, retry } = useDiscovery(filters);

  // Text inputs are local while typing and pushed to the URL after a short pause.
  // When the URL changes from outside (back button, links), adopt its values during render.
  const [q, setQ] = useState(filters.q ?? '');
  const [skill, setSkill] = useState(filters.skill ?? '');
  const [synced, setSynced] = useState({ q: filters.q, skill: filters.skill });
  if (synced.q !== filters.q || synced.skill !== filters.skill) {
    setSynced({ q: filters.q, skill: filters.skill });
    if (synced.q !== filters.q && (filters.q ?? '') !== q.trim()) setQ(filters.q ?? '');
    if (synced.skill !== filters.skill && (filters.skill ?? '') !== skill.trim()) setSkill(filters.skill ?? '');
  }

  const setFilter = (key: FilterKey, value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value.trim()) next.set(key, value.trim());
        else next.delete(key);
        return next;
      },
      { replace: key === 'q' || key === 'skill' },
    );
  };

  useEffect(() => {
    if (q.trim() === (filters.q ?? '')) return;
    const t = setTimeout(() => setFilter('q', q), TEXT_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (skill.trim() === (filters.skill ?? '')) return;
    const t = setTimeout(() => setFilter('skill', skill), TEXT_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [skill]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAll = () => {
    setQ('');
    setSkill('');
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      FILTER_KEYS.forEach((k) => next.delete(k));
      return next;
    });
  };

  // Suggest skills already visible in results; typing any other skill still works.
  const skillSuggestions = useMemo(
    () => (state.status === 'ready' ? [...new Set(state.items.flatMap((p) => p.requiredSkills))].sort() : []),
    [state],
  );

  const filtered = hasActiveFilters(filters);

  return (
    <div className="disc-explore">
      <header className="disc-explore-head">
        <h1 className="page-title">Explore projects</h1>
        <p className="muted">
          Published projects across the North East. Filter by where you are and what you can do.
        </p>
      </header>

      <FixtureNotice />

      <form className="disc-filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="disc-field disc-field-wide">
          <span>Search</span>
          <input
            type="search"
            placeholder="Title or pitch…"
            value={q}
            maxLength={120}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="disc-field">
          <span>Location</span>
          <select value={filters.location ?? ''} onChange={(e) => setFilter('location', e.target.value)}>
            <option value="">Anywhere</option>
            {NORTH_EAST_LOCATIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
            {filters.location && !NORTH_EAST_LOCATIONS.some((l) => l.toLowerCase() === filters.location!.toLowerCase()) && (
              <option value={filters.location}>{filters.location}</option>
            )}
          </select>
        </label>
        <label className="disc-field">
          <span>Skill needed</span>
          <input
            type="text"
            list="disc-skill-options"
            placeholder="e.g. React"
            value={skill}
            maxLength={60}
            onChange={(e) => setSkill(e.target.value)}
          />
          <datalist id="disc-skill-options">
            {skillSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <SectorInput
          label="Sector"
          className="disc-field"
          placeholder="Any sector"
          value={filters.sector ?? ''}
          onChange={(sector) => setFilter('sector', sector)}
        />
        <label className="disc-field">
          <span>Stage</span>
          <select value={filters.stage ?? ''} onChange={(e) => setFilter('stage', e.target.value)}>
            <option value="">Any stage</option>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        {filtered && (
          <button type="button" className="btn btn-ghost btn-sm disc-clear" onClick={clearAll}>
            Clear filters
          </button>
        )}
      </form>

      <p className="small muted disc-count" aria-live="polite">
        {state.status === 'ready' &&
          `${state.total} ${state.total === 1 ? 'project' : 'projects'}${filtered ? ' match your filters' : ''}`}
      </p>

      <DiscoveryResults
        state={state}
        queryKey={toQueryString(filters)}
        cardHeadingLevel={2}
        onRetry={retry}
        onLoadMore={loadMore}
        loadingMore={loadingMore}
        moreError={moreError}
        empty={
          filtered ? (
            <>
              <p><strong>No published projects match those filters.</strong></p>
              <p className="muted">Try another skill or location, or widen your search.</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={clearAll}>Clear filters</button>
            </>
          ) : (
            <>
              <p><strong>No projects have been published yet.</strong></p>
              <p className="muted">Have an idea that needs people? Be the first to share it.</p>
              <Link to="/projects/new" className="btn btn-primary btn-sm">Start a project</Link>
            </>
          )
        }
      />
    </div>
  );
}
