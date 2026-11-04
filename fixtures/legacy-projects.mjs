// The original TyneFlow AI and Vanguard Patient Portal fixtures (first committed in
// frontend/src/data/mockData.ts, since replaced there), preserved and adapted to the
// canonical contract shape as docs/DEMO.md requires.
//
// Entirely fictional: no real users, no NHS or university affiliation, no measured
// traction and no independently verified milestones. Wording was adjusted to avoid
// implying any of those. `daysAgo` values are resolved at seed time.

export const LEGACY_PROJECTS = [
  {
    key: 'legacy:tyne-flow',
    title: 'TyneFlow AI',
    pitch: 'Low-cost sensors and small services to monitor river quality and urban run-off in Newcastle and Gateshead.',
    problem: 'Community groups have little timely, local data about run-off and water quality on smaller Tyneside watercourses.',
    solution: 'Cheap sensor nodes report readings to a simple API and public dashboard so volunteers can spot problems early.',
    sector: 'CleanTech',
    location: 'Newcastle', // legacy fixture said "Newcastle Helix"; canonical filters use the town
    stage: 'prototype',
    status: 'active',
    createdDaysAgo: 75,
    needs: [
      {
        key: 'n1', title: 'FastAPI developer', description: 'Build the ingestion API that receives sensor readings.',
        requiredSkills: ['Python', 'FastAPI'], desirableSkills: ['PostgreSQL'], participationType: 'contributor',
        hoursPerWeek: 6, workMode: 'remote', compensation: 'voluntary', status: 'open', createdDaysAgo: 20,
      },
      {
        key: 'n2', title: 'Hardware specialist', description: 'Design a weatherproof ESP32 sensor node with the founder.',
        requiredSkills: ['C++', 'ESP32', 'IoT'], desirableSkills: [], participationType: 'cofounder',
        hoursPerWeek: 10, workMode: 'hybrid', compensation: 'equity_discussion', status: 'open', createdDaysAgo: 20,
      },
    ],
    posts: [
      { key: 'p1', type: 'progress', daysAgo: 8, body: 'Second prototype node logged readings for a full week on a test bench.' },
      { key: 'p2', type: 'announcement', daysAgo: 2, body: 'We are opening two roles; details are on the project page.' },
    ],
    milestones: [
      { key: 'm1', title: 'First sensor node logging readings', description: 'Founder-reported bench test.', daysAgo: 30, evidenceUrl: null },
    ],
  },
  {
    key: 'legacy:durham-health',
    title: 'Vanguard Patient Portal',
    pitch: 'A consent-first prototype for how researchers could request access to regional health-research datasets.',
    problem: 'Explaining and recording consent for secondary research use of health data is slow and opaque for everyone involved.',
    solution: 'A clickable prototype of a consent dashboard and request workflow, built with dummy data only, to test the idea with researchers.',
    sector: 'HealthTech',
    location: 'Durham',
    stage: 'mvp', // legacy display stage "Active Beta"
    status: 'active',
    createdDaysAgo: 60,
    needs: [
      {
        key: 'n3', title: 'Frontend engineer', description: 'Turn the clickable prototype into a React front end using dummy data.',
        requiredSkills: ['React', 'TypeScript', 'Tailwind'], desirableSkills: ['Accessibility'], participationType: 'contributor',
        hoursPerWeek: 8, workMode: 'remote', compensation: 'voluntary', status: 'open', createdDaysAgo: 15,
      },
      {
        key: 'n4', title: 'User researcher (filled)', description: 'Ran five interviews about the consent flow. This role is closed.',
        requiredSkills: ['User research'], desirableSkills: [], participationType: 'task',
        hoursPerWeek: 4, workMode: 'hybrid', compensation: 'voluntary', status: 'closed', createdDaysAgo: 45,
      },
    ],
    posts: [
      { key: 'p1', type: 'milestone', daysAgo: 12, body: 'Clickable consent prototype finished and shared for feedback (dummy data only).' },
      { key: 'p2', type: 'roadblock', daysAgo: 5, body: 'We need a frontend engineer before we can test the real interaction flow.' },
    ],
    milestones: [
      { key: 'm1', title: 'Clickable prototype completed', description: 'Founder-reported; uses dummy data only.', daysAgo: 12, evidenceUrl: null },
    ],
  },
];
