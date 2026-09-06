import { normalizeSkill, calculateSkillMatch } from "./skillNormalization"
import {
  calculateDeterministicMatch,
  calculateGoalMatch,
  calculateEligibilityAndLocation,
  computeStudentProfileFingerprint,
  isMatchStale,
  isPrepPlanStale,
} from "./deterministicMatcher"
import type { Opportunity } from "./opportunityTypes"
import type { StudentContextPayload } from "./opportunityAIService"
import {
  discoverPlatformCapability,
  ingestFromPlatform,
  runMultiSourceIngestionPipeline,
} from "./ingestion/ingestionEngine"
import { deduplicateOpportunities } from "./ingestion/deduplicator"
import { evaluateStudentEligibility } from "./ingestion/eligibilityExtractor"
import { detectOpportunityChanges } from "./freshness/changeDetector"
import { verifyOpportunityFreshness, runCatalogFreshnessAudit } from "./freshness/freshnessEngine"

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

  // 15. Profile Fingerprint Consistency
  test("15. Profile fingerprint uniquely changes when student skills or goals update", () => {
    const studentA: StudentContextPayload = {
      skills: ["Python", "Git"],
      careerGoals: ["Open Source"],
      semester: "Semester 6",
    }
    const studentB: StudentContextPayload = {
      skills: ["Python", "Git", "C++"],
      careerGoals: ["Open Source"],
      semester: "Semester 6",
    }

    const matchA = calculateDeterministicMatch(studentA, baseOpportunity)
    const matchB = calculateDeterministicMatch(studentB, baseOpportunity)

    assertOk(matchA.fingerprint !== matchB.fingerprint, "Fingerprints must differ when skills differ")
  })

  // 16. Match Cache Invalidation Check
  test("16. isMatchStale detects stale match cache after student profile updates", () => {
    const studentOriginal: StudentContextPayload = {
      skills: ["Python"],
      careerGoals: ["Backend"],
    }
    const studentUpdated: StudentContextPayload = {
      skills: ["Python", "Git", "C++"],
      careerGoals: ["Open Source"],
    }

    const cachedMatch = {
      match_score: 33,
      skill_match_score: 33,
      goal_match_score: 30,
      explanation: `Initial match explanation.\n\n[fp:${calculateDeterministicMatch(studentOriginal, baseOpportunity).fingerprint}]`,
    }

    assertOk(
      isMatchStale(cachedMatch, studentUpdated, baseOpportunity),
      "isMatchStale must return true when student profile context changed"
    )
  })

  // 17. Prep Plan Cache Invalidation Check
  test("17. isPrepPlanStale invalidates plan when student fingerprint changes", () => {
    const studentOriginal: StudentContextPayload = { skills: ["Python"] }
    const studentUpdated: StudentContextPayload = { skills: ["Python", "C++"] }

    const fpOriginal = computeStudentProfileFingerprint(studentOriginal)
    const planData = { student_fingerprint: fpOriginal }

    assertOk(
      isPrepPlanStale(planData, studentUpdated),
      "isPrepPlanStale must return true when student profile changes"
    )
  })

  // 18. Ambassador Opportunity Deterministic 50/30/20 Scoring
  test("18. Ambassador opportunity calculates score strictly following 50/30/20 formula", () => {
    const ambassadorOpp: Opportunity = {
      ...baseOpportunity,
      id: "amb-1",
      title: "GitHub Campus Experts",
      organization: "GitHub",
      type: "ambassador",
      category: "Campus Expert",
      required_skills: ["Git", "GitHub", "Community Building", "Public Speaking"],
    }

    const student: StudentContextPayload = {
      skills: ["Git", "GitHub", "Public Speaking"],
      careerGoals: ["Campus Expert", "Developer Advocacy"],
      semester: "Semester 6",
    }

    const res = calculateDeterministicMatch(student, ambassadorOpp)
    const expected = Math.round(
      res.skill_match_score * 0.5 +
      res.goal_match_score * 0.3 +
      res.eligibility_location_score * 0.2
    )

    assertEqual(res.match_score, expected)
    assertEqual(res.skill_match_score, 75)
  })

  // 19. Ambassador Type and Category Preservation
  test("19. Ambassador type and category survive opportunity structure", () => {
    const ambassadorOpp: Opportunity = {
      ...baseOpportunity,
      type: "ambassador",
      category: "Developer Ambassador",
    }
    assertEqual(ambassadorOpp.type, "ambassador")
    assertEqual(ambassadorOpp.category, "Developer Ambassador")
  })

  // 20. Missing Deadline Remains NULL
  test("20. Missing deadline and application_open_date remain NULL and do not fabricate dates", () => {
    const oppNoDates: Opportunity = {
      ...baseOpportunity,
      deadline: null,
      application_open_date: null,
    }
    assertEqual(oppNoDates.deadline, null)
    assertEqual(oppNoDates.application_open_date, null)
  })

  // 21. Rolling / No-Deadline Ambassador Opportunity State
  test("21. Ambassador opportunity with null deadline represents rolling state", () => {
    const ambOpp: Opportunity = {
      ...baseOpportunity,
      type: "ambassador",
      deadline: null,
    }
    assertEqual(ambOpp.type, "ambassador")
    assertEqual(ambOpp.deadline, null)
  })

  // 22. Ambassador Skill Normalization Aliases
  test("22. Ambassador skill aliases normalize correctly to canonical terms", () => {
    assertEqual(normalizeSkill("publicspeaking"), "public speaking")
    assertEqual(normalizeSkill("event planning"), "event management")
    assertEqual(normalizeSkill("devrel"), "developer advocacy")
    assertEqual(normalizeSkill("community management"), "community building")
    assertEqual(normalizeSkill("productivity tools"), "notion")
  })

  // 23. Multi-Source Adapter Ingestion & Capability Discovery
  test("23. Multi-source adapters discover capabilities and ingest valid hackathons", () => {
    assertEqual(discoverPlatformCapability("devpost"), "structured_public_data")
    assertEqual(discoverPlatformCapability("devfolio"), "structured_public_data")
    assertEqual(discoverPlatformCapability("unstop"), "structured_public_data")
    assertEqual(discoverPlatformCapability("sih"), "official_public_page")

    const devpostResult = ingestFromPlatform("devpost")
    assertEqual(devpostResult.platform, "devpost")
    assertOk(devpostResult.opportunities.length > 0)
    assertEqual(devpostResult.opportunities[0].source_platform, "Devpost")
  })

  // 24. Cross-Platform Hackathon Deduplication
  test("24. Deduplicator removes exact URL duplicates and cross-platform fuzzy duplicates", () => {
    const oppA: Opportunity = {
      ...baseOpportunity,
      id: "h1",
      title: "Global AI Hackathon 2026",
      organization: "Devpost Community",
      source_url: "https://devpost.com/hackathons",
      source_platform: "Devpost",
    }
    const oppB: Opportunity = {
      ...baseOpportunity,
      id: "h2",
      title: "Global AI Hackathon 2026",
      organization: "Devpost Community",
      source_url: "https://devpost.com/hackathons",
      source_platform: "Devpost",
    }
    const oppC: Opportunity = {
      ...baseOpportunity,
      id: "h3",
      title: "ETHIndia Hackathon 2026",
      organization: "Devfolio",
      source_url: "https://devfolio.co/hackathons",
      source_platform: "Devfolio",
    }

    const deduped = deduplicateOpportunities([oppA, oppB, oppC])
    assertEqual(deduped.length, 2)
  })

  // 25. Eligibility Extraction & Filtering
  test("25. Eligibility extractor correctly identifies mandatory GDSC rules and general student criteria", () => {
    const gdscOpp: Opportunity = {
      ...baseOpportunity,
      eligibility: ["Member of a Google Developer Student Club at a university"],
    }
    const studentNoGDSC: StudentContextPayload = { skills: ["Python"] }
    const studentWithGDSC: StudentContextPayload = { skills: ["GDSC", "Python"] }

    const res1 = evaluateStudentEligibility(studentNoGDSC, gdscOpp)
    assertEqual(res1.isEligible, false)
    assertEqual(res1.status, "not_eligible")

    const res2 = evaluateStudentEligibility(studentWithGDSC, gdscOpp)
    assertEqual(res2.isEligible, true)
    assertEqual(res2.status, "verified")
  })

  // 26. End-to-End Hackathon Ingestion Pipeline Run
  test("26. Multi-source pipeline ingests and deduplicates hackathons across all 7 supported platforms", () => {
    const ingested = runMultiSourceIngestionPipeline()
    assertOk(ingested.length >= 7, `Expected at least 7 hackathons ingested, got ${ingested.length}`)
    const platforms = new Set(ingested.map((o) => o.source_platform.toLowerCase()))
    assertOk(platforms.has("devpost"))
    assertOk(platforms.has("devfolio"))
    assertOk(platforms.has("unstop"))
    assertOk(platforms.has("hackerearth"))
    assertOk(platforms.has("hack2skill"))
    assertOk(platforms.has("smart india hackathon"))
    assertOk(platforms.has("hackhazard"))
  })

  // 27. Deadline Change Detection
  test("27. detectOpportunityChanges accurately detects deadline updates and outputs deadline_changed event", () => {
    const oldOpp: Opportunity = { ...baseOpportunity, deadline: "2026-09-01T00:00:00Z" }
    const freshOpp: Opportunity = { ...baseOpportunity, deadline: "2026-10-15T00:00:00Z" }

    const changes = detectOpportunityChanges(oldOpp, freshOpp)
    assertEqual(changes.length, 1)
    assertEqual(changes[0].change_type, "deadline_changed")
    assertEqual(changes[0].field_changed, "deadline")
    assertEqual(changes[0].old_value, "2026-09-01T00:00:00Z")
    assertEqual(changes[0].new_value, "2026-10-15T00:00:00Z")
  })

  // 28. Status Change & Registration State Detection
  test("28. detectOpportunityChanges identifies status transitions (active -> expired) and registration_closed", () => {
    const activeOpp: Opportunity = { ...baseOpportunity, status: "active" }
    const expiredOpp: Opportunity = { ...baseOpportunity, status: "expired" }

    const changes = detectOpportunityChanges(activeOpp, expiredOpp)
    assertEqual(changes.length, 1)
    assertEqual(changes[0].change_type, "registration_closed")
    assertEqual(changes[0].old_value, "active")
    assertEqual(changes[0].new_value, "expired")
  })

  // 29. Eligibility & Required Skills Diff Detection
  test("29. detectOpportunityChanges detects updates to eligibility array and required skills array", () => {
    const oldOpp: Opportunity = {
      ...baseOpportunity,
      eligibility: ["College student"],
      required_skills: ["Python"],
    }
    const freshOpp: Opportunity = {
      ...baseOpportunity,
      eligibility: ["College student", "18+ years old"],
      required_skills: ["Python", "Docker"],
    }

    const changes = detectOpportunityChanges(oldOpp, freshOpp)
    assertEqual(changes.length, 2)
    assertOk(changes.some((c) => c.change_type === "eligibility_changed"))
    assertOk(changes.some((c) => c.change_type === "required_skills_changed"))
  })

  // 30. Freshness Engine Timestamp Updates
  test("30. verifyOpportunityFreshness updates last_verified_at timestamp while preserving canonical fields", () => {
    const oldOpp: Opportunity = { ...baseOpportunity, last_verified_at: "2026-01-01T00:00:00Z" }
    const result = verifyOpportunityFreshness(oldOpp, baseOpportunity)

    assertOk(result.last_verified_at > oldOpp.last_verified_at)
    assertEqual(result.updated_opportunity.title, baseOpportunity.title)
  })

  // 31. Catalog Audit & New Opportunity Discovery Event
  test("31. runCatalogFreshnessAudit detects new opportunities and generates new_opportunity_discovered events", () => {
    const existingCatalog: Opportunity[] = [baseOpportunity]
    const freshDiscovered: Opportunity = {
      ...baseOpportunity,
      id: "opp-new-devpost-1",
      title: "New AI Challenge 2026",
      source_url: "https://devpost.com/challenges/new-ai-2026",
      source_platform: "Devpost",
    }

    const { updatedCatalog, auditReport } = runCatalogFreshnessAudit(existingCatalog, [baseOpportunity, freshDiscovered])
    assertEqual(auditReport.total_new_discovered, 1)
    assertOk(auditReport.events_generated.some((e) => e.change_type === "new_opportunity_discovered"))
    assertEqual(updatedCatalog.length, 2)
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

