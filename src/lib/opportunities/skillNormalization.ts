const SKILL_ALIASES: Record<string, string> = {
  javascript: "javascript",
  js: "javascript",

  typescript: "typescript",
  ts: "typescript",

  react: "react",
  reactjs: "react",
  "react.js": "react",

  node: "node.js",
  nodejs: "node.js",
  "node.js": "node.js",

  postgres: "postgresql",
  postgresql: "postgresql",

  next: "next.js",
  nextjs: "next.js",
  "next.js": "next.js",

  python: "python",
  py: "python",

  golang: "go",
  go: "go",

  cpp: "c++",
  "c++": "c++",

  vue: "vue",
  vuejs: "vue",
  "vue.js": "vue",

  angular: "angular",
  angularjs: "angular",

  docker: "docker",
  containers: "docker",

  aws: "aws",
  "amazon web services": "aws",

  solidity: "solidity",
  smartcontracts: "solidity",
  "smart contracts": "solidity",

  flutter: "flutter",
  firebase: "firebase",
  android: "android",
  tensorflow: "tensorflow",

  // Ambassador & Community Skill Mappings
  "public speaking": "public speaking",
  publicspeaking: "public speaking",
  presentation: "public speaking",

  "event management": "event management",
  "event planning": "event management",
  "event organizing": "event management",
  "workshop hosting": "event management",
  "workshop facilitation": "event management",

  "community building": "community building",
  "community management": "community building",
  "community leadership": "community building",

  "developer advocacy": "developer advocacy",
  devrel: "developer advocacy",
  "developer relations": "developer advocacy",
  "technical evangelism": "developer advocacy",

  "content creation": "content creation",
  "technical writing": "content creation",
  blogging: "content creation",

  "api testing": "api testing",
  "rest apis": "api testing",
  postman: "postman",

  notion: "notion",
  "productivity tools": "notion",
}

export function normalizeSkill(skill: string): string {
  if (!skill) return ""
  const cleaned = skill
    .trim()
    .toLowerCase()
    .replace(/[;:]$/g, "")
  return SKILL_ALIASES[cleaned] ?? cleaned
}

export function normalizeSkillSet(skills: string[]): Set<string> {
  const set = new Set<string>()
  for (const s of skills) {
    const normalized = normalizeSkill(s)
    if (normalized) set.add(normalized)
  }
  return set
}

export function calculateSkillMatch(
  studentSkills: string[],
  requiredSkills: string[]
): { skillScore: number; matched: string[]; missing: string[] } {
  if (!requiredSkills || requiredSkills.length === 0) {
    return { skillScore: 100, matched: studentSkills, missing: [] }
  }

  const studentNormalizedMap = new Map<string, string>()
  for (const s of studentSkills) {
    const norm = normalizeSkill(s)
    if (norm) studentNormalizedMap.set(norm, s)
  }

  const matched: string[] = []
  const missing: string[] = []

  for (const req of requiredSkills) {
    const reqNorm = normalizeSkill(req)
    if (studentNormalizedMap.has(reqNorm)) {
      matched.push(req)
    } else {
      missing.push(req)
    }
  }

  const skillScore = Math.round((matched.length / requiredSkills.length) * 100)
  return { skillScore, matched, missing }
}
