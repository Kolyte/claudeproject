// Suggested skills (P5). Unlike sectors this list is open: people may enter any skill,
// but known skills and their common spellings are stored under one canonical name, so
// "ReactJS", "react.js" and "React" all match each other in discovery.
// Keep identical to the backend copy (a test enforces this).
export const SKILLS = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#', 'Go', 'Rust', 'Kotlin', 'Swift', 'PHP',
  'Ruby', 'R', 'SQL', 'Scala', 'Dart', 'Elixir', 'Bash', 'Solidity',
  // Frontend and mobile
  'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'HTML', 'CSS', 'Tailwind CSS', 'Redux',
  'React Native', 'Flutter', 'iOS', 'Android', 'Leaflet',
  // Backend and APIs
  'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Ruby on Rails', 'Laravel', '.NET',
  'GraphQL', 'REST APIs', 'WebSockets',
  // Data
  'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'Supabase', 'Firebase', 'Elasticsearch',
  'Data Analysis', 'Data Engineering', 'Data Visualisation', 'Pandas', 'Power BI', 'Excel', 'Statistics',
  // AI and ML
  'AI/ML', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'scikit-learn', 'NLP',
  'Computer Vision', 'LLMs', 'Prompt Engineering', 'MLOps',
  // Cloud and DevOps
  'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux', 'Git',
  'GitHub Actions', 'Cybersecurity', 'Penetration Testing', 'Testing & QA', 'Playwright', 'Jest',
  // Hardware
  'IoT', 'Arduino', 'ESP32', 'Raspberry Pi', 'Embedded Systems', 'PCB Design', 'CAD', '3D Printing',
  'Robotics', 'Blockchain',
  // Design and research
  'Figma', 'UX Design', 'UI Design', 'User Research', 'Graphic Design', 'Accessibility', 'Illustration',
  'Video Editing', 'Photography',
  // Business and community
  'Product Management', 'Project Management', 'Marketing', 'Social Media', 'SEO', 'Copywriting', 'Sales',
  'Business Development', 'Fundraising', 'Finance & Accounting', 'Legal', 'Operations',
  'Community Management', 'Teaching', 'Mentoring', 'Safeguarding', 'Event Planning', 'Hardware', 'Product',
] as const;

/** Common alternative spellings -> canonical skill. Keys are compared case-insensitively. */
export const SKILL_ALIASES: Record<string, (typeof SKILLS)[number]> = {
  js: 'JavaScript', ecmascript: 'JavaScript', ts: 'TypeScript', py: 'Python', python3: 'Python',
  golang: 'Go', cpp: 'C++', 'c plus plus': 'C++', csharp: 'C#', 'c sharp': 'C#', 'shell scripting': 'Bash',
  reactjs: 'React', 'react.js': 'React', 'react js': 'React', nextjs: 'Next.js', next: 'Next.js',
  vue: 'Vue.js', vuejs: 'Vue.js', angularjs: 'Angular', html5: 'HTML', css3: 'CSS', tailwind: 'Tailwind CSS',
  tailwindcss: 'Tailwind CSS', 'react-native': 'React Native', 'reactnative': 'React Native',
  node: 'Node.js', nodejs: 'Node.js', 'node js': 'Node.js', expressjs: 'Express', 'express.js': 'Express',
  spring: 'Spring Boot', rails: 'Ruby on Rails', dotnet: '.NET', 'asp.net': '.NET', rest: 'REST APIs',
  'rest api': 'REST APIs', api: 'REST APIs', apis: 'REST APIs',
  postgres: 'PostgreSQL', postgre: 'PostgreSQL', psql: 'PostgreSQL', pg: 'PostgreSQL', mongo: 'MongoDB',
  'data visualization': 'Data Visualisation', dataviz: 'Data Visualisation', 'data science': 'Data Analysis',
  ai: 'AI/ML', ml: 'AI/ML', 'ai & ml': 'AI/ML', 'ai/ml': 'AI/ML', aiml: 'AI/ML', 'artificial intelligence': 'AI/ML',
  'ai development': 'AI/ML', sklearn: 'scikit-learn', 'natural language processing': 'NLP', llm: 'LLMs',
  'large language models': 'LLMs', 'gen ai': 'LLMs', genai: 'LLMs',
  gcp: 'Google Cloud', 'google cloud platform': 'Google Cloud', 'amazon web services': 'AWS', k8s: 'Kubernetes',
  'ci cd': 'CI/CD', cicd: 'CI/CD', security: 'Cybersecurity', infosec: 'Cybersecurity',
  pentesting: 'Penetration Testing', qa: 'Testing & QA', testing: 'Testing & QA',
  'internet of things': 'IoT', embedded: 'Embedded Systems', 'embedded c': 'Embedded Systems', rpi: 'Raspberry Pi',
  ux: 'UX Design', ui: 'UI Design', 'ux research': 'User Research', 'ui/ux': 'UX Design', 'ux/ui': 'UX Design',
  'product design': 'UX Design', a11y: 'Accessibility', pm: 'Product Management', 'social media marketing': 'Social Media',
  accounting: 'Finance & Accounting', bookkeeping: 'Finance & Accounting', bizdev: 'Business Development',
};

const fold = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-GB');
const BY_KEY = new Map<string, string>([
  ...SKILLS.map((s) => [fold(s), s] as [string, string]),
  ...Object.entries(SKILL_ALIASES).map(([alias, s]) => [fold(alias), s] as [string, string]),
]);

/** Canonical name for a known skill or alias; otherwise the trimmed input (skills stay open). */
export function canonicalSkill(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return BY_KEY.get(fold(trimmed)) ?? trimmed;
}

/** Canonicalises a list and removes case-insensitive duplicates, keeping the first spelling. */
export function canonicalSkills(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const s = canonicalSkill(v);
    const key = fold(s);
    if (s && !seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}

/** Turns a comma-separated value ("react, Postgres") into canonical, de-duplicated skills. */
export function parseSkillList(text: string): string[] {
  return canonicalSkills(text.split(',').map((s) => s.trim()).filter(Boolean));
}

/**
 * Suggestions for a partial skill: whole-name prefixes first, then any word prefix
 * ("post" -> PostgreSQL), plus skills whose alias starts with the query ("reactj" -> React).
 */
export function suggestSkills(query: string, limit = 8, exclude: readonly string[] = []): string[] {
  const q = fold(query);
  const skip = new Set(exclude.map((s) => fold(canonicalSkill(s))));
  if (!q) return SKILLS.filter((s) => !skip.has(fold(s))).slice(0, limit);
  const words = (s: string) => fold(s).split(/[^a-z0-9+#.]+/).filter(Boolean);
  const rank = new Map<string, number>();
  for (const s of SKILLS) {
    const f = fold(s);
    if (f.startsWith(q)) rank.set(s, 0);
    else if (words(s).some((w) => w.startsWith(q))) rank.set(s, 1);
  }
  for (const [alias, s] of Object.entries(SKILL_ALIASES)) {
    if (!rank.has(s) && fold(alias).startsWith(q)) rank.set(s, 2);
  }
  return [...rank.entries()]
    .filter(([s]) => !skip.has(fold(s)))
    .sort((a, b) => a[1] - b[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([s]) => s);
}
