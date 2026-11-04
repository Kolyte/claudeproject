import { DISCOVERY_SOURCE } from './api.ts';

/** Visible whenever discovery runs on the development fixture, so it is never mistaken for live data. */
export default function FixtureNotice() {
  if (DISCOVERY_SOURCE !== 'fixtures') return null;
  return (
    <p className="disc-fixture-notice" role="note">
      Development preview: showing fictional fixture data, not live projects.
    </p>
  );
}
