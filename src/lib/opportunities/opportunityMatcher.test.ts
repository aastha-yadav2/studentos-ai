import { normalizeSkill, calculateSkillMatch } from "./skillNormalization"
import {
  calculateDeterministicMatch,
  calculateGoalMatch,
  calculateEligibilityAndLocation,
} from "./deterministicMatcher"
import type { Opportunity } from "./opportunityTypes"
import type { StudentContextPayload } from "./opportunityAIService"

const baseOpportunity: Opportunity = {
  id: "opp-123",
  title: "Google Summer of Code",
  organization: "Google",
  type: "fellowship",
  category: "Open Source Development",
  description: "Global online program focused on open source software development.",
  eligibility: ["18+ years old", "Enrolled in post-secondary education"],
  required_skills: ["Python", "Git", "C++"],
  location: "Remote",
  stipend_prize: "Stipend",
  source_url: "https://summerofcode.withgoogle.com",
  source_platform: "Google",
  deadline: null,
  status: "active",
  verification_state: "verified",
  last_verified_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(message ?? `Assertion failed: expected ${expected}, got ${actual}`)
  }
}

function assertOk(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message ?? "Assertion failed: expected condition to be true")
  }
}

export function runOpportunityMatcherTests(): { name: string; status: "pass" | "fail"; error?: string }[] {
  const results: { name: string; status: "pass" | "fail"; error?: string }[] = []

  function test(name: string, fn: () => void) {
    try {
      fn()
      results.push({ name, status: "pass" })
    } catch (err) {
      results.push({ name, status: "fail", error: err instanceof Error ? err.message : String(err) })
    }
  }

  // 1. Perfect Skill Match
  test("1. Perfect skill match returns 100% skill score", () => {
    const result = calculateSkillMatch(["Python", "Git", "C++"], ["Python", "Git", "C++"])
    assertEqual(result.skillScore, 100)
    assertEqual(result.matched.length, 3)
    assertEqual(result.missing.length, 0)
  })

  // 2. Partial Skill Match
  test("2. Partial skill match calculates proportional score", () => {
    const result = calculateSkillMatch(["Python", "Git"], ["Python", "Git", "C++"])
    assertEqual(result.skillScore, 67)
    assertEqual(result.matched.length, 2)
    assertEqual(result.missing.length, 1)
  })

  // 3. Zero Skill Match
  test("3. Zero skill match returns 0% skill score", () => {
    const result = calculateSkillMatch(["Java", "SQL"], ["Python", "Git", "C++"])
    assertEqual(result.skillScore, 0)
    assertEqual(result.matched.length, 0)
    assertEqual(result.missing.length, 3)
  })

  // 4. JS -> JavaScript normalization
  test("4. JS normalizes to javascript", () => {
    assertEqual(normalizeSkill("js"), "javascript")
    assertEqual(normalizeSkill("JS"), "javascript")
    const result = calculateSkillMatch(["js"], ["JavaScript"])
    assertEqual(result.skillScore, 100)
  })

  // 5. TS -> TypeScript normalization
  test("5. TS normalizes to typescript", () => {
    assertEqual(normalizeSkill("ts"), "typescript")
    assertEqual(normalizeSkill("TS"), "typescript")
    const result = calculateSkillMatch(["TS"], ["TypeScript"])
    assertEqual(result.skillScore, 100)
  })

  // 6. React.js -> React normalization
  test("6. React.js normalizes to react", () => {
    assertEqual(normalizeSkill("React.js"), "react")
    assertEqual(normalizeSkill("reactjs"), "react")
    const result = calculateSkillMatch(["React.js"], ["React"])
    assertEqual(result.skillScore, 100)
  })

  // 7. Goal Match
  test("7. Relevant student goals match opportunity category and type", () => {
    const student: StudentContextPayload = {
      careerGoals: ["Open Source Development", "Software Engineering"],
    }
    const score = calculateGoalMatch(student, baseOpportunity)
    assertOk(score >= 75, `Expected goal score >= 75, got ${score}`)
  })

  // 8. Missing Goal Information
  test("8. Missing goal information returns neutral score (50)", () => {
    const student: StudentContextPayload = {
      careerGoals: [],
      internshipInterests: [],
      hackathonInterests: [],
    }
    const score = calculateGoalMatch(student, baseOpportunity)
    assertEqual(score, 50)
  })

  // 9. Unknown Eligibility
  test("9. Empty eligibility list returns unknown status and neutral score", () => {
    const oppNoEligibility: Opportunity = { ...baseOpportunity, eligibility: [] }
    const result = calculateEligibilityAndLocation({}, oppNoEligibility)
    assertEqual(result.status, "unknown")
    assertEqual(result.eligibilityScore, 70)
  })

  // 10. Not-Eligible Case
  test("10. Missing mandatory eligibility criteria returns not_eligible status", () => {
    const oppGDSC: Opportunity = {
      ...baseOpportunity,
      eligibility: ["Member of a Google Developer Student Club at a university"],
    }
    const student: StudentContextPayload = {
      skills: ["React"],
      careerGoals: ["Frontend"],
    }
    const result = calculateEligibilityAndLocation(student, oppGDSC)
    assertEqual(result.status, "not_eligible")
    assertOk(result.eligibilityScore <= 30)
  })

  // 11. Remote Location
  test("11. Remote location returns 100 location score", () => {
    const result = calculateEligibilityAndLocation({}, baseOpportunity)
    assertEqual(result.locationScore, 100)
  })

  // 12. Location Mismatch
  test("12. Non-remote location without matching student location returns reduced score", () => {
    const oppOnsite: Opportunity = { ...baseOpportunity, location: "Tokyo, Japan" }
    const student: StudentContextPayload = { semester: "Semester 6" }
    const result = calculateEligibilityAndLocation(student, oppOnsite)
    assertEqual(result.locationScore, 40)
  })

  // 13. Same Input Produces Same Score (Determinism)
  test("13. Same input produces identical score every time", () => {
    const student: StudentContextPayload = {
      skills: ["Python", "Git"],
      careerGoals: ["Open Source"],
      semester: "Semester 6",
    }

    const run1 = calculateDeterministicMatch(student, baseOpportunity)
    const run2 = calculateDeterministicMatch(student, baseOpportunity)

    assertEqual(run1.match_score, run2.match_score)
    assertEqual(run1.skill_match_score, run2.skill_match_score)
    assertEqual(run1.goal_match_score, run2.goal_match_score)
    assertEqual(run1.eligibility_location_score, run2.eligibility_location_score)
  })

  // 14. Final Score Follows 50/30/20 Weighting
  test("14. Final score strictly obeys 50% Skill, 30% Goal, 20% Eligibility/Location weighting", () => {
    const student: StudentContextPayload = {
      skills: ["Python", "Git", "C++"],
      careerGoals: ["Open Source Development"],
      semester: "Semester 6",
    }

    const res = calculateDeterministicMatch(student, baseOpportunity)
    const expected = Math.round(
      res.skill_match_score * 0.5 +
      res.goal_match_score * 0.3 +
      res.eligibility_location_score * 0.2
    )

    assertEqual(res.match_score, expected)
  })

  return results
}

// Executed when run directly via CLI
const gProc = (globalThis as unknown as { process?: { argv: string[]; exit: (code: number) => void } }).process
if (gProc && gProc.argv[1]?.includes("opportunityMatcher.test.ts")) {
  console.log("Running Opportunity Matcher Unit Tests...")
  const testResults = runOpportunityMatcherTests()
  let passed = 0
  let failed = 0
  for (const r of testResults) {
    if (r.status === "pass") {
      console.log(`✔ ${r.name}`)
      passed++
    } else {
      console.error(`✖ ${r.name}: ${r.error}`)
      failed++
    }
  }
  console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`)
  if (failed > 0) gProc.exit(1)
}
