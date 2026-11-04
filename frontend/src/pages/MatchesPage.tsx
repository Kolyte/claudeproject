import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { demoContributor } from '../data/mockData';
import { rankMatches, WEIGHTS } from '../lib/matching';
import { useProjects } from '../state/ProjectsContext';
import type { ContributorProfile } from '../../types';

const dimensionLabels: Record<keyof typeof WEIGHTS, string> = {
  skills: 'Required skills',
  domain: 'Interest',
  availability: 'Availability',
  location: 'Location',
  participation: 'Role type',
};

export default function MatchesPage() {
  const { projects } = useProjects();
  const [profile, setProfile] = useState<ContributorProfile>(demoContributor);
  const [removed, setRemoved] = useState<string[]>([]);

  // The profile actually used for matching: skills the user has not rejected
  const activeProfile = useMemo(
    () => ({ ...profile, skills: profile.skills.filter((s) => !removed.includes(s.name)) }),
    [profile, removed],
  );
  const matches = useMemo(() => rankMatches(activeProfile, projects), [activeProfile, projects]);

  const toggleSkill = (name: string) =>
    setRemoved((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  return (
    <div className="two-col matches-layout">
      <aside className="col-side">
        <section className="card pad">
          <h3>Your skills profile</h3>
          <p className="hint">
            Extracted from 3 public GitHub repos you selected, plus what you added. Untick anything that is wrong;
            matches update instantly.
          </p>
          <ul className="skill-list">
            {profile.skills.map((s) => {
              const off = removed.includes(s.name);
              return (
                <li key={s.name} className={off ? 'off' : ''}>
                  <label className="row gap-sm">
                    <input type="checkbox" checked={!off} onChange={() => toggleSkill(s.name)} />
                    <strong>{s.name}</strong>
                    <span className={`tag tag-${s.confidence === 'Demonstrated' ? 'verified' : s.confidence === 'Mentioned only' ? 'warn' : 'reported'}`}>
                      {s.confidence}
                    </span>
                  </label>
                  <div className="muted small evidence">
                    {s.source === 'GitHub' ? '⌥ GitHub' : s.source === 'Experience' ? '💼 Experience' : '✎ Declared'} · {s.evidence}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card pad">
          <h3>Availability</h3>
          <label className="range">
            <span>{profile.hoursPerWeek} hours / week</span>
            <input
              type="range"
              min={1}
              max={20}
              value={profile.hoursPerWeek}
              onChange={(e) => setProfile({ ...profile, hoursPerWeek: Number(e.target.value) })}
            />
          </label>
          <p className="small muted">
            📍 {profile.location} · open to {profile.workModes.join(' / ').toLowerCase()} · interested in{' '}
            {profile.interests.join(', ')}
          </p>
        </section>
      </aside>

      <div className="col-main">
        <h1 className="page-title">Recommended for {profile.name}</h1>
        <p className="muted">
          Ranked by a heuristic fit score from your profile and each role's stated needs. It is not a prediction of success.
        </p>

        {matches.length === 0 && <p className="empty">No open roles fit your current profile.</p>}

        {matches.map((m) => (
          <article key={m.need.id} className="card pad match">
            <div className="match-head">
              <div>
                <Link to={`/projects/${m.project.slug}`} className="match-project">
                  <span className="dot" style={{ background: m.project.accent }} />
                  {m.project.title}
                </Link>
                <h3>{m.need.title}</h3>
                <div className="small muted">
                  {m.need.workType} · {m.need.hoursPerWeek}h/week · {m.need.workMode} · {m.need.compensation}
                </div>
              </div>
              <div className="score">
                <div className="score-num">{m.score}</div>
                <div className="score-label">fit</div>
              </div>
            </div>

            <div className="breakdown">
              {(Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((k) => (
                <div key={k} className="bar-row">
                  <span className="bar-label">{dimensionLabels[k]}</span>
                  <div className="bar">
                    <div className="bar-fill" style={{ width: `${(m.breakdown[k] / WEIGHTS[k]) * 100}%` }} />
                  </div>
                  <span className="bar-val">{Math.round(m.breakdown[k])}/{WEIGHTS[k]}</span>
                </div>
              ))}
            </div>

            <div className="why">
              {m.reasons.length > 0 && (
                <ul className="reasons">
                  {m.reasons.map((r) => <li key={r}>✓ {r}</li>)}
                </ul>
              )}
              {m.gaps.length > 0 && (
                <ul className="gaps">
                  {m.gaps.map((g) => <li key={g}>– {g}</li>)}
                </ul>
              )}
            </div>

            <Link to={`/projects/${m.project.slug}`} className="btn btn-secondary btn-sm">
              View project & apply →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
