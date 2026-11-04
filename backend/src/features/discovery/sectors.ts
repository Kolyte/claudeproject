// Fixed project sectors (P5). Founders choose one of these; discovery filters on them.
// Keep identical to frontend/src/features/discovery/sectors.ts (a test enforces this).
export const SECTORS = [
  'Accessibility & Inclusion',
  'Advertising & Marketing',
  'Aerospace',
  'Ageing & Care',
  'Agritech',
  'AI Development',
  'AR & VR',
  'Artificial Intelligence',
  'Arts & Culture',
  'Automotive',
  'Biotech',
  'Blockchain & Web3',
  'Charity & Nonprofit',
  'Childcare & Family',
  'Circular Economy',
  'CivicTech & Government',
  'CleanTech',
  'Climate',
  'Cloud & DevOps',
  'Community',
  'Construction & Property',
  'Consulting & Professional Services',
  'Creative Industries',
  'Cybersecurity',
  'Data & Analytics',
  'Developer Tools',
  'E-commerce',
  'EdTech',
  'Education',
  'Energy',
  'Events',
  'Fashion & Textiles',
  'Film & TV',
  'Finance',
  'FinTech',
  'Food & Drink',
  'FoodTech',
  'Gaming',
  'Hardware & IoT',
  'Health',
  'HealthTech',
  'Hospitality & Tourism',
  'Housing',
  'HR & Work',
  'InsurTech',
  'Legal & RegTech',
  'Local Services',
  'Logistics & Transport',
  'Machine Learning',
  'Manufacturing',
  'Marine & Offshore',
  'Media & Publishing',
  'MedTech',
  'Mental Health & Wellbeing',
  'Mobile Apps',
  'Music',
  'Open Source',
  'Pets & Animals',
  'Pharma & Life Sciences',
  'PropTech',
  'Quantum Computing',
  'Recruitment',
  'Renewable Energy',
  'Retail',
  'Robotics & Automation',
  'SaaS',
  'Smart Cities',
  'Social Enterprise',
  'Software Development',
  'Software Engineering',
  'Space',
  'Sport & Fitness',
  'Sustainability',
  'Telecoms',
  'Travel',
  'Waste & Recycling',
  'Water',
  'Web Development',
] as const;

export type Sector = (typeof SECTORS)[number];

const fold = (s: string) => s.trim().toLocaleLowerCase('en-GB');

/** Returns the canonical sector for a case-insensitive exact match, or null. */
export function canonicalSector(value: string): Sector | null {
  const key = fold(value);
  return SECTORS.find((s) => fold(s) === key) ?? null;
}

/**
 * Sectors where any word starts with the query ("fi" -> Film & TV, Finance, FinTech, Sport & Fitness).
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
