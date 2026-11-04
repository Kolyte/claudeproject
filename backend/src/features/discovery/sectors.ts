// Fixed project sectors (P5). Founders choose one of these; discovery filters on them.
// Keep identical to frontend/src/features/discovery/sectors.ts (a test enforces this).
export const SECTORS = [
  'Agritech',
  'Arts & Culture',
  'Artificial Intelligence',
  'Biotech',
  'Charity & Nonprofit',
  'CleanTech',
  'Climate',
  'Community',
  'Construction & Property',
  'Creative Industries',
  'Cybersecurity',
  'Data & Analytics',
  'E-commerce',
  'Education',
  'EdTech',
  'Energy',
  'Finance',
  'Fintech',
  'Food & Drink',
  'Gaming',
  'Hardware & IoT',
  'Health',
  'HealthTech',
  'Hospitality & Tourism',
  'HR & Work',
  'Legal & RegTech',
  'Local Services',
  'Logistics & Transport',
  'Machine Learning',
  'Manufacturing',
  'Marine & Offshore',
  'Media & Publishing',
  'Music',
  'Retail',
  'Software Engineering',
  'Space',
  'Sport & Fitness',
  'Sustainability',
] as const;

export type Sector = (typeof SECTORS)[number];

const fold = (s: string) => s.trim().toLocaleLowerCase('en-GB');

/** Returns the canonical sector for a case-insensitive exact match, or null. */
export function canonicalSector(value: string): Sector | null {
  const key = fold(value);
  return SECTORS.find((s) => fold(s) === key) ?? null;
}

/**
 * Sectors where any word starts with the query ("fi" -> Finance, Fintech, Sport & Fitness).
 * Prefix-of-the-whole-name matches come first, then alphabetical. Empty query returns all.
 */
export function suggestSectors(query: string, limit: number = SECTORS.length): Sector[] {
  const q = fold(query);
  if (!q) return SECTORS.slice(0, limit);
  const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter(Boolean);
  const qWords = q.split(/[^a-z0-9]+/).filter(Boolean);
  const hits = SECTORS.filter((s) => {
    if (fold(s).startsWith(q)) return true;
    const w = words(s);
    // Every query word must prefix some word of the sector ("data an" -> Data & Analytics).
    return qWords.length > 0 && qWords.every((qw) => w.some((sw) => sw.startsWith(qw)));
  });
  return hits
    .sort((a, b) => Number(fold(b).startsWith(q)) - Number(fold(a).startsWith(q)) || a.localeCompare(b))
    .slice(0, limit);
}
