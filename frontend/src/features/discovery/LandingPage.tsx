import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DiscoveryResults from './DiscoveryResults.tsx';
import FixtureNotice from './FixtureNotice.tsx';
import { NORTH_EAST_LOCATIONS, toQueryString } from './filters.ts';
import { useDiscovery } from './useDiscovery.ts';
import './discovery.css';

const NO_FILTERS = {};

export default function LandingPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { state, retry } = useDiscovery(NO_FILTERS, 3);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const qs = toQueryString({ q });
    navigate(qs ? `/explore?${qs}` : '/explore');
  };

  return (
    <div className="disc-landing">
      <section className="disc-hero">
        <div className="disc-hero-copy"><p className="disc-eyebrow">Projects · People · Progress / North East England</p><h1>Discover what the North East is building.</h1>
        <p className="disc-hero-lead">
          Find a project worth joining, or the people who can help build yours.
        </p>
        <form className="disc-hero-search" role="search" onSubmit={onSearch}>
          <label className="disc-sr" htmlFor="disc-landing-q">Search projects</label>
          <input
            id="disc-landing-q"
            type="search"
            placeholder="Search projects by title or pitch…"
            value={q}
            maxLength={120}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Explore</button>
        </form>
        <div className="disc-places" aria-label="Browse by place">
          {NORTH_EAST_LOCATIONS.map((l) => (
            <Link key={l} to={`/explore?${toQueryString({ location: l })}`} className="disc-place">
              {l}
            </Link>
          ))}
        </div>
        </div>
        <aside className="disc-intro-ticket" aria-label="Your next project starts here">
          <div className="disc-ticket-band">North East Origins / Open invitation</div>
          <div className="disc-ticket-content">
            <h2>Good things start<br />with people.</h2>
            <p>An idea on your doorstep. A skill someone needs. A little time to make something happen.</p>
            <dl className="disc-ticket-facts">
              <div><dt>Where</dt><dd>North East England</dd></div>
              <div><dt>Who</dt><dd>Founders &amp; contributors</dd></div>
              <div><dt>Starting point</dt><dd>Any stage, even an idea</dd></div>
            </dl>
            <Link className="disc-ticket-link" to="/projects/new">Share what you are building →</Link>
          </div>
        </aside>
      </section>

      <FixtureNotice />

      <section className="disc-section">
        <div className="disc-section-head">
          <h2>Recently published</h2>
          <Link to="/explore" className="small">See all projects →</Link>
        </div>
        <DiscoveryResults
          state={state}
          onRetry={retry}
          skeletonCount={3}
          empty={
            <>
              <p><strong>No projects have been published yet.</strong></p>
              <Link to="/projects/new" className="btn btn-primary btn-sm">Start the first one</Link>
            </>
          }
        />
      </section>

      <section className="disc-section disc-steps" aria-label="How it works">
        <div className="card disc-step">
          <span className="disc-step-num">1</span>
          <h3>Share what you are building</h3>
          <p className="muted small">Publish a project, even at the idea stage. No traction needed to be listed.</p>
        </div>
        <div className="card disc-step">
          <span className="disc-step-num">2</span>
          <h3>Show progress as you go</h3>
          <p className="muted small">Post dated updates and founder-reported milestones so people can follow along.</p>
        </div>
        <div className="card disc-step">
          <span className="disc-step-num">3</span>
          <h3>Ask for specific help</h3>
          <p className="muted small">Open roles with the skills, hours and work mode you need, and review applications.</p>
        </div>
      </section>

      <section className="disc-cta">
        <h2>Got an idea that needs people?</h2>
        <Link to="/projects/new" className="btn btn-primary">Start a project</Link>
      </section>
    </div>
  );
}
