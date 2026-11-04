// Transparent, deterministic matching (spec section 9). No AI here: the AI's job
// later is only to produce the structured skills list; ranking stays explainable.
import type { ContributorProfile, Project, ProjectNeed, Town } from '../../types';

export const WEIGHTS = {
  skills: 40,
  domain: 20,
  availability: 20,
  location: 10,
  participation: 10,
} as const;

export interface Match {
  project: Project;
  need: ProjectNeed;
  score: number; // 0-100 heuristic fit, NOT a success probability
  breakdown: Record<keyof typeof WEIGHTS, number>; // points earned per dimension
  reasons: string[];
  gaps: string[];
}

const neighbours: Partial<Record<Town, Town[]>> = {
  Newcastle: ['Gateshead', 'Northumberland'],
  Gateshead: ['Newcastle'],
  Durham: ['Sunderland', 'Newcastle', 'Teesside'],
  Sunderland: ['Durham', 'Newcastle'],
  Teesside: ['Durham'],
};

export function scoreNeed(profile: ContributorProfile, project: Project, need: ProjectNeed): Match | null {
  // Eligibility filters first
  if (need.status !== 'Open' || project.status !== 'Active') return null;
  if (!profile.workTypes.includes(need.workType)) return null;
  if (need.workMode !== 'Remote' && !profile.workModes.includes(need.workMode)) return null;

  const reasons: string[] = [];
  const gaps: string[] = [];
  const find = (s: string) => profile.skills.find((k) => k.name.toLowerCase() === s.toLowerCase());

  // 1. Required skill coverage (mentioned-only skills count half)
  let covered = 0;
  for (const req of need.requiredSkills) {
    const skill = find(req);
    if (!skill) {
      gaps.push(`No evidence found for required skill ${req}.`);
    } else if (skill.confidence === 'Mentioned only') {
      covered += 0.5;
      gaps.push(`${req} is only mentioned in your repos, not demonstrated.`);
    } else {
      covered += 1;
      reasons.push(`Needs ${req}: ${skill.evidence.charAt(0).toLowerCase() + skill.evidence.slice(1)}.`);
    }
  }
  for (const des of need.desirableSkills) {
    if (!find(des)) gaps.push(`No evidence for preferred ${des} experience.`);
  }
  const skills = need.requiredSkills.length ? (covered / need.requiredSkills.length) * WEIGHTS.skills : WEIGHTS.skills;

  // 2. Interest / domain
  const domainHit = profile.interests.includes(project.sector);
  const domain = domainHit ? WEIGHTS.domain : 0;
  if (domainHit) reasons.push(`You are interested in ${project.sector}.`);

  // 3. Availability
  const availRatio = Math.min(1, profile.hoursPerWeek / need.hoursPerWeek);
  const availability = availRatio * WEIGHTS.availability;
  if (availRatio === 1) reasons.push(`Your ${profile.hoursPerWeek}h/week covers the ${need.hoursPerWeek}h asked for.`);
  else gaps.push(`Asks for ${need.hoursPerWeek}h/week; you offered ${profile.hoursPerWeek}h.`);

  // 4. Location / work mode
  let loc = 0.3;
  if (need.workMode === 'Remote' || project.location === profile.location) loc = 1;
  else if (neighbours[profile.location]?.includes(project.location)) loc = 0.7;
  const location = loc * WEIGHTS.location;
  if (loc === 1 && need.workMode !== 'Remote') reasons.push(`Based in ${project.location}, like you.`);
  if (loc < 1) gaps.push(`${need.workMode} in ${project.location}, you are in ${profile.location}.`);

  // 5. Participation type (already filtered, so always a fit here)
  const participation = WEIGHTS.participation;

  const breakdown = { skills, domain, availability, location, participation };
  const score = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0));
  return { project, need, score, breakdown, reasons, gaps };
}

export function rankMatches(profile: ContributorProfile, projects: Project[]): Match[] {
  return projects
    .flatMap((p) => p.needs.map((n) => scoreNeed(profile, p, n)))
    .filter((m): m is Match => m !== null)
    .sort((a, b) => b.score - a.score);
}
