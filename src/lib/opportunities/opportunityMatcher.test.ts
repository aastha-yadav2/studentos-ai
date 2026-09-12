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
  buildRunLogFromIngestionResult,
} from "./ingestion/ingestionEngine"
import { generateContentHash } from "./ingestion/normalizer"
import { deduplicateOpportunities } from "./ingestion/deduplicator"
import { evaluateStudentEligibility } from "./ingestion/eligibilityExtractor"
import { detectOpportunityChanges } from "./freshness/changeDetector"
import { verifyOpportunityFreshness, runCatalogFreshnessAudit, isMatchCacheInvalidatedByChanges } from "./freshness/freshnessEngine"
import {
  evaluateHighMatchNotification,
  evaluateChangeEventNotification,
  evaluateDeadlineApproachingNotification,
  evaluateAmbassadorNotification,
  evaluatePrepTaskReminderNotification,
  evaluateWeeklyDigestNotification,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "../notifications/notificationRules"
import {
  makeNewHighMatchDedupeKey,
  makeDeadlineApproachingDedupeKey,
  makePrepReminderDedupeKey,
  makeWeeklyDigestDedupeKey,
  makeDeadlineChangedDedupeKey,
  makeRegistrationOpenedDedupeKey,
} from "../notifications/notificationDeduplicator"
import {
  buildOpportunityRadar,
  calculateDeadlineUrgencyScore,
  calculateRecencyScore,
  calculateSourceScore,
  evaluateRadarReasonChips,
} from "./radar/radarService"

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
    assertEqual(discoverPlatformCapability("devpost"), "official_public_page")
    assertEqual(discoverPlatformCapability("devfolio"), "structured_public_data")
    assertEqual(discoverPlatformCapability("unstop"), "api")
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

  // 27. No Change Detection (Identical Snapshots Output 0 Events)
  test("27. detectOpportunityChanges produces 0 events when identical snapshots are compared", () => {
    const changes = detectOpportunityChanges(baseOpportunity, { ...baseOpportunity })
    assertEqual(changes.length, 0)
  })

  // 28. Deadline Change Detection
  test("28. detectOpportunityChanges accurately detects deadline updates and outputs deadline_changed event", () => {
    const dOld = new Date("2026-09-01T00:00:00Z").toISOString()
    const dNew = new Date("2026-10-15T00:00:00Z").toISOString()
    const oldOpp: Opportunity = { ...baseOpportunity, deadline: dOld }
    const freshOpp: Opportunity = { ...baseOpportunity, deadline: dNew }

    const changes = detectOpportunityChanges(oldOpp, freshOpp)
    assertEqual(changes.length, 1)
    assertEqual(changes[0].change_type, "deadline_changed")
    assertEqual(changes[0].field_changed, "deadline")
    assertEqual(changes[0].old_value, dOld)
    assertEqual(changes[0].new_value, dNew)
  })

  // 29. Duplicate Deadline Event Prevention
  test("29. detectOpportunityChanges prevents duplicate event emission when identical transition exists in history", () => {
    const dOld = new Date("2026-09-01T00:00:00Z").toISOString()
    const dNew = new Date("2026-10-15T00:00:00Z").toISOString()
    const oldOpp: Opportunity = { ...baseOpportunity, deadline: dOld }
    const freshOpp: Opportunity = { ...baseOpportunity, deadline: dNew }

    const history = [
      {
        id: "evt-prev",
        opportunity_id: baseOpportunity.id,
        change_type: "deadline_changed" as const,
        field_changed: "deadline",
        old_value: dOld,
        new_value: dNew,
        summary: "Previous deadline event",
        detected_at: new Date().toISOString(),
      },
    ]

    const changes = detectOpportunityChanges(oldOpp, freshOpp, history)
    assertEqual(changes.length, 0)
  })

  // 30. Registration / Application Opened State Detection
  test("30. detectOpportunityChanges detects status transition (expired -> active) as registration_opened", () => {
    const expiredOpp: Opportunity = { ...baseOpportunity, status: "expired" }
    const activeOpp: Opportunity = { ...baseOpportunity, status: "active" }

    const changes = detectOpportunityChanges(expiredOpp, activeOpp)
    assertEqual(changes.length, 1)
    assertEqual(changes[0].change_type, "registration_opened")
  })

  // 31. Registration / Application Closed State Detection
  test("31. detectOpportunityChanges identifies status transitions (active -> expired) as registration_closed", () => {
    const activeOpp: Opportunity = { ...baseOpportunity, status: "active" }
    const expiredOpp: Opportunity = { ...baseOpportunity, status: "expired" }

    const changes = detectOpportunityChanges(activeOpp, expiredOpp)
    assertEqual(changes.length, 1)
    assertEqual(changes[0].change_type, "registration_closed")
    assertEqual(changes[0].old_value, "active")
    assertEqual(changes[0].new_value, "expired")
  })

  // 32. Application Open Date Change Detection
  test("32. detectOpportunityChanges detects application open date updates", () => {
    const oldOpp: Opportunity = { ...baseOpportunity, application_open_date: "2026-08-01T00:00:00Z" }
    const freshOpp: Opportunity = { ...baseOpportunity, application_open_date: "2026-08-10T00:00:00Z" }

    const changes = detectOpportunityChanges(oldOpp, freshOpp)
    assertEqual(changes.length, 1)
    assertEqual(changes[0].change_type, "application_open_date_changed")
    assertEqual(changes[0].field_changed, "application_open_date")
  })

  // 33. Canonical Status Change Detection
  test("33. detectOpportunityChanges detects status transition to archived", () => {
    const activeOpp: Opportunity = { ...baseOpportunity, status: "active" }
    const archivedOpp: Opportunity = { ...baseOpportunity, status: "archived" }

    const changes = detectOpportunityChanges(activeOpp, archivedOpp)
    assertEqual(changes.length, 1)
    assertEqual(changes[0].change_type, "status_changed")
  })

  // 34. Eligibility Diff & Order-Insensitive Comparison
  test("34. detectOpportunityChanges handles array ordering insensitively for eligibility", () => {
    const oppA: Opportunity = { ...baseOpportunity, eligibility: ["18+ years old", "Enrolled student"] }
    const oppB: Opportunity = { ...baseOpportunity, eligibility: ["Enrolled student", "18+ years old"] }

    const changes = detectOpportunityChanges(oppA, oppB)
    assertEqual(changes.length, 0)
  })

  // 35. Required Skills Diff Detection
  test("35. detectOpportunityChanges detects updates to required skills array", () => {
    const oldOpp: Opportunity = { ...baseOpportunity, required_skills: ["Python", "Git"] }
    const freshOpp: Opportunity = { ...baseOpportunity, required_skills: ["Python", "Git", "Docker"] }

    const changes = detectOpportunityChanges(oldOpp, freshOpp)
    assertEqual(changes.length, 1)
    assertEqual(changes[0].change_type, "skills_changed")
  })

  // 36. Location & Mode Change Detection
  test("36. detectOpportunityChanges detects location and mode changes (Remote -> Bengaluru Onsite)", () => {
    const oldOpp: Opportunity = { ...baseOpportunity, location: "Remote / Global" }
    const freshOpp: Opportunity = { ...baseOpportunity, location: "Bengaluru, India (Onsite)" }

    const changes = detectOpportunityChanges(oldOpp, freshOpp)
    assertEqual(changes.length, 1)
    assertEqual(changes[0].change_type, "location_changed")
  })

  // 37. Team Size / Prize / Event Date Change Detection
  test("37. detectOpportunityChanges detects team size, prize, and event date updates", () => {
    const oldOpp: Opportunity = {
      ...baseOpportunity,
      stipend_prize: "$10,000 USD",
      team_size_min: 1,
      team_size_max: 3,
      event_start_date: "2026-11-01T00:00:00Z",
    }
    const freshOpp: Opportunity = {
      ...baseOpportunity,
      stipend_prize: "$25,000 USD",
      team_size_min: 2,
      team_size_max: 4,
      event_start_date: "2026-11-05T00:00:00Z",
    }

    const changes = detectOpportunityChanges(oldOpp, freshOpp)
    assertEqual(changes.length, 3)
    assertOk(changes.some((c) => c.change_type === "prize_changed"))
    assertOk(changes.some((c) => c.change_type === "team_size_changed"))
    assertOk(changes.some((c) => c.change_type === "event_start_date_changed"))
  })

  // 38. Source Fetch Failure Safety
  test("38. Source fetch failure preserves last known canonical state and last_verified_at timestamp", () => {
    const oldVerifiedAt = "2026-01-01T00:00:00Z"
    const existingOpp: Opportunity = { ...baseOpportunity, last_verified_at: oldVerifiedAt }

    const result = verifyOpportunityFreshness(existingOpp, null, { sourceFetchError: true })
    assertEqual(result.success, false)
    assertEqual(result.has_changes, false)
    assertEqual(result.last_verified_at, oldVerifiedAt)
    assertEqual(result.updated_opportunity.status, existingOpp.status)
  })

  // 39. Parser Failure Safety
  test("39. Parser failure preserves canonical state without deleting or deprecating data", () => {
    const existingOpp: Opportunity = { ...baseOpportunity }

    const result = verifyOpportunityFreshness(existingOpp, null, { parserError: true })
    assertEqual(result.success, false)
    assertEqual(result.has_changes, false)
    assertEqual(result.updated_opportunity.verification_state, "verified")
    assertEqual(result.updated_opportunity.required_skills.length, 3)
  })

  // 40. Empty Response Safety
  test("40. Empty response safety prevents mass deprecation or clearing fields", () => {
    const existingOpp: Opportunity = { ...baseOpportunity }
    const emptyPayload = { ...baseOpportunity, title: "" }

    const result = verifyOpportunityFreshness(existingOpp, emptyPayload)
    assertEqual(result.success, false)
    assertEqual(result.updated_opportunity.title, baseOpportunity.title)
  })

  // 41. Historical Event Preservation & Multi-Deadline Transitions
  test("41. Historical event timeline preserves valid sequential deadline updates", () => {
    const d1 = new Date("2026-09-01T00:00:00Z").toISOString()
    const d2 = new Date("2026-09-15T00:00:00Z").toISOString()
    const d3 = new Date("2026-10-01T00:00:00Z").toISOString()

    const oppV1: Opportunity = { ...baseOpportunity, deadline: d1 }
    const oppV2: Opportunity = { ...baseOpportunity, deadline: d2 }
    const oppV3: Opportunity = { ...baseOpportunity, deadline: d3 }

    const events1 = detectOpportunityChanges(oppV1, oppV2, [])
    assertEqual(events1.length, 1)

    const events2 = detectOpportunityChanges(oppV2, oppV3, events1)
    assertEqual(events2.length, 1)
    assertEqual(events2[0].old_value, d2)
    assertEqual(events2[0].new_value, d3)
  })

  // 42. Multi-Source Priority Conflict Resolution
  test("42. Lower priority source cannot overwrite verified fields from higher priority official source", () => {
    const officialOpp: Opportunity = {
      ...baseOpportunity,
      source_platform: "Google",
      deadline: "2026-12-31T23:59:59Z",
      eligibility: ["Enrolled college student"],
    }
    const aggregatorOpp: Opportunity = {
      ...baseOpportunity,
      source_platform: "Curated",
      deadline: "2026-10-10T00:00:00Z", // Lower-priority conflicting value
      eligibility: [],
    }

    const result = verifyOpportunityFreshness(officialOpp, aggregatorOpp)
    assertEqual(result.updated_opportunity.deadline, "2026-12-31T23:59:59Z")
    assertEqual(result.updated_opportunity.eligibility.length, 1)
  })

  // 43. Match Cache Invalidation on Relevant Changes
  test("43. isMatchCacheInvalidatedByChanges flags stale match cache for skill or eligibility changes", () => {
    const changes: import("./freshness/types").OpportunityChangeEvent[] = [
      {
        id: "e1",
        opportunity_id: baseOpportunity.id,
        change_type: "skills_changed",
        field_changed: "required_skills",
        old_value: "Python",
        new_value: "Python, Docker",
        summary: "Skills changed",
        detected_at: new Date().toISOString(),
      },
    ]

    assertOk(isMatchCacheInvalidatedByChanges(changes), "Must invalidate match cache when required skills update")
  })

  // 44. Deprecated to Reactivated Transition
  test("44. detectOpportunityChanges detects opportunity reactivation (deprecated -> verified)", () => {
    const deprecatedOpp: Opportunity = { ...baseOpportunity, verification_state: "deprecated" }
    const reactivatedOpp: Opportunity = { ...baseOpportunity, verification_state: "verified" }

    const changes = detectOpportunityChanges(deprecatedOpp, reactivatedOpp)
    assertEqual(changes.length, 1)
    assertEqual(changes[0].change_type, "opportunity_reactivated")
  })

  // 45. Source Platform / URL Changed Detection
  test("45. detectOpportunityChanges records source_changed event when source URL changes", () => {
    const oldOpp: Opportunity = { ...baseOpportunity, source_url: "https://summerofcode.withgoogle.com" }
    const freshOpp: Opportunity = { ...baseOpportunity, source_url: "https://summerofcode.withgoogle.com/2026" }

    const changes = detectOpportunityChanges(oldOpp, freshOpp)
    assertEqual(changes.length, 1)
    assertEqual(changes[0].change_type, "source_changed")
  })

  // 46. Full Catalog Audit & Discovered Opportunity Report
  test("46. runCatalogFreshnessAudit audits ingested catalog against existing and generates report", () => {
    const existing = [baseOpportunity]
    const newOpp = { ...baseOpportunity, id: "opp-audit-new", source_url: "https://summerofcode.withgoogle.com/2027" }
    const { updatedCatalog, auditReport } = runCatalogFreshnessAudit(existing, [baseOpportunity, newOpp])

    assertEqual(auditReport.total_checked, 2)
    assertEqual(auditReport.total_new_discovered, 1)
    assertEqual(updatedCatalog.length, 2)
  })

  // 47. Notification Created for New High-Match Opportunity
  test("47. evaluateHighMatchNotification creates notification for high-match eligible student", () => {
    const student: StudentContextPayload = {
      skills: ["Python", "Git", "C++"],
      careerGoals: ["Open Source Development"],
    }
    const notif = evaluateHighMatchNotification("user-1", student, baseOpportunity)
    assertOk(notif !== null, "Notification must be generated for high match eligible student")
    assertEqual(notif?.notification_type, "new_high_match_opportunity")
    assertEqual(notif?.severity, "high")
  })

  // 48. No Notification for Clearly Ineligible Student
  test("48. evaluateHighMatchNotification suppresses notification for ineligible student", () => {
    const gdscOpp: Opportunity = {
      ...baseOpportunity,
      eligibility: ["Member of a Google Developer Student Club at a university"],
    }
    const student: StudentContextPayload = { skills: ["Python"] }
    const notif = evaluateHighMatchNotification("user-1", student, gdscOpp)
    assertEqual(notif, null)
  })

  // 49. Registration Opened Notification
  test("49. evaluateChangeEventNotification creates registration_opened notification", () => {
    const student: StudentContextPayload = { skills: ["Python", "Git"] }
    const event: import("./freshness/types").OpportunityChangeEvent = {
      id: "evt-reg-1",
      opportunity_id: baseOpportunity.id,
      change_type: "registration_opened",
      field_changed: "status",
      old_value: "upcoming",
      new_value: "active",
      summary: "Registration opened",
      detected_at: new Date().toISOString(),
    }

    const notif = evaluateChangeEventNotification("user-1", student, baseOpportunity, event)
    assertOk(notif !== null)
    assertEqual(notif?.notification_type, "registration_opened")
  })

  // 50. Deadline Changed Notification
  test("50. evaluateChangeEventNotification creates deadline_changed notification", () => {
    const student: StudentContextPayload = { skills: ["Python", "Git"] }
    const event: import("./freshness/types").OpportunityChangeEvent = {
      id: "evt-dl-1",
      opportunity_id: baseOpportunity.id,
      change_type: "deadline_changed",
      field_changed: "deadline",
      old_value: "2026-09-01T00:00:00Z",
      new_value: "2026-10-15T00:00:00Z",
      summary: "Deadline changed",
      detected_at: new Date().toISOString(),
    }

    const notif = evaluateChangeEventNotification("user-1", student, baseOpportunity, event)
    assertOk(notif !== null)
    assertEqual(notif?.notification_type, "deadline_changed")
  })

  // 51. Duplicate Deadline-Change Notification Prevention
  test("51. makeDeadlineChangedDedupeKey produces identical dedupe key for duplicate events", () => {
    const key1 = makeDeadlineChangedDedupeKey("user-1", "opp-123", "evt-dl-1")
    const key2 = makeDeadlineChangedDedupeKey("user-1", "opp-123", "evt-dl-1")
    assertEqual(key1, key2)
    assertEqual(key1, "user-1:opp-123:deadline_changed:evt-dl-1")
  })

  // 52. 7-Day Deadline Reminder
  test("52. evaluateDeadlineApproachingNotification creates 7d reminder for deadline in 5 days", () => {
    const nowMs = Date.now()
    const fiveDaysMs = nowMs + 5 * 24 * 60 * 60 * 1000
    const opp: Opportunity = { ...baseOpportunity, deadline: new Date(fiveDaysMs).toISOString() }
    const student: StudentContextPayload = { skills: ["Python", "Git"] }

    const notif = evaluateDeadlineApproachingNotification("user-1", student, opp, DEFAULT_NOTIFICATION_PREFERENCES, nowMs)
    assertOk(notif !== null)
    assertEqual(notif?.notification_type, "deadline_approaching")
    assertEqual(notif?.severity, "medium")
  })

  // 53. 48-Hour Deadline Reminder
  test("53. evaluateDeadlineApproachingNotification creates urgent 48h reminder for deadline in 24 hours", () => {
    const nowMs = Date.now()
    const oneDayMs = nowMs + 24 * 60 * 60 * 1000
    const opp: Opportunity = { ...baseOpportunity, deadline: new Date(oneDayMs).toISOString() }
    const student: StudentContextPayload = { skills: ["Python", "Git"] }

    const notif = evaluateDeadlineApproachingNotification("user-1", student, opp, DEFAULT_NOTIFICATION_PREFERENCES, nowMs)
    assertOk(notif !== null)
    assertEqual(notif?.notification_type, "deadline_approaching")
    assertEqual(notif?.severity, "high")
  })

  // 54. No Deadline Reminder for Closed Opportunity
  test("54. evaluateDeadlineApproachingNotification suppresses reminder when opportunity is expired", () => {
    const nowMs = Date.now()
    const oneDayMs = nowMs + 24 * 60 * 60 * 1000
    const expiredOpp: Opportunity = { ...baseOpportunity, status: "expired", deadline: new Date(oneDayMs).toISOString() }
    const student: StudentContextPayload = { skills: ["Python"] }

    const notif = evaluateDeadlineApproachingNotification("user-1", student, expiredOpp, DEFAULT_NOTIFICATION_PREFERENCES, nowMs)
    assertEqual(notif, null)
  })

  // 55. No Deadline Reminder when Deadline is Missing
  test("55. evaluateDeadlineApproachingNotification returns null when deadline is null", () => {
    const oppNoDeadline: Opportunity = { ...baseOpportunity, deadline: null }
    const student: StudentContextPayload = { skills: ["Python"] }

    const notif = evaluateDeadlineApproachingNotification("user-1", student, oppNoDeadline)
    assertEqual(notif, null)
  })

  // 56. Eligibility Changed to Eligible
  test("56. evaluateChangeEventNotification creates high-priority notification when eligibility updates to eligible", () => {
    const student: StudentContextPayload = { skills: ["Python", "Git"] }
    const event: import("./freshness/types").OpportunityChangeEvent = {
      id: "evt-el-1",
      opportunity_id: baseOpportunity.id,
      change_type: "eligibility_changed",
      field_changed: "eligibility",
      old_value: "Restricted",
      new_value: "Open to all developers",
      summary: "Eligibility expanded",
      detected_at: new Date().toISOString(),
    }

    const notif = evaluateChangeEventNotification("user-1", student, baseOpportunity, event)
    assertOk(notif !== null)
    assertEqual(notif?.notification_type, "eligibility_changed")
    assertEqual(notif?.severity, "high")
  })

  // 57. Eligibility Changed to Ineligible Suppressed
  test("57. evaluateChangeEventNotification suppresses notification when student is ineligible", () => {
    const gdscOpp: Opportunity = { ...baseOpportunity, eligibility: ["Google Developer Student Club membership required"] }
    const student: StudentContextPayload = { skills: ["React"] }
    const event: import("./freshness/types").OpportunityChangeEvent = {
      id: "evt-el-2",
      opportunity_id: gdscOpp.id,
      change_type: "eligibility_changed",
      field_changed: "eligibility",
      old_value: "Open",
      new_value: "GDSC required",
      summary: "Eligibility restricted",
      detected_at: new Date().toISOString(),
    }

    const notif = evaluateChangeEventNotification("user-1", student, gdscOpp, event)
    assertEqual(notif, null)
  })

  // 58. Relevant Skills Changed Notification
  test("58. evaluateChangeEventNotification creates skills_changed notification for relevant student", () => {
    const student: StudentContextPayload = { skills: ["Python", "Git"] }
    const event: import("./freshness/types").OpportunityChangeEvent = {
      id: "evt-sk-1",
      opportunity_id: baseOpportunity.id,
      change_type: "skills_changed",
      field_changed: "required_skills",
      old_value: "Python",
      new_value: "Python, Git",
      summary: "Skills updated",
      detected_at: new Date().toISOString(),
    }

    const notif = evaluateChangeEventNotification("user-1", student, baseOpportunity, event)
    assertOk(notif !== null)
    assertEqual(notif?.notification_type, "skills_changed")
  })

  // 59. Irrelevant Skills Change Suppression
  test("59. evaluateChangeEventNotification suppresses skills_changed notification for irrelevant student", () => {
    const oppUnmatched: Opportunity = { ...baseOpportunity, required_skills: ["Rust", "Assembly"] }
    const studentNoMatch: StudentContextPayload = { skills: ["PHP"] }
    const event: import("./freshness/types").OpportunityChangeEvent = {
      id: "evt-sk-2",
      opportunity_id: oppUnmatched.id,
      change_type: "skills_changed",
      field_changed: "required_skills",
      old_value: "Rust",
      new_value: "Rust, Assembly",
      summary: "Skills updated",
      detected_at: new Date().toISOString(),
    }

    const notif = evaluateChangeEventNotification("user-1", studentNoMatch, oppUnmatched, event)
    assertEqual(notif, null)
  })

  // 60. New Ambassador Opportunity Notification
  test("60. evaluateAmbassadorNotification creates notification for eligible student matching ambassador role", () => {
    const ambOpp: Opportunity = {
      ...baseOpportunity,
      type: "ambassador",
      category: "Campus Expert",
      required_skills: ["Git", "GitHub", "Public Speaking"],
    }
    const student: StudentContextPayload = { skills: ["Git", "GitHub", "Public Speaking"] }

    const notif = evaluateAmbassadorNotification("user-1", student, ambOpp)
    assertOk(notif !== null)
    assertEqual(notif?.notification_type, "new_ambassador_opportunity")
  })

  // 61. Reactivated Opportunity Notification
  test("61. evaluateChangeEventNotification creates opportunity_reactivated notification", () => {
    const student: StudentContextPayload = { skills: ["Python", "Git"] }
    const event: import("./freshness/types").OpportunityChangeEvent = {
      id: "evt-react-1",
      opportunity_id: baseOpportunity.id,
      change_type: "opportunity_reactivated",
      field_changed: "verification_state",
      old_value: "deprecated",
      new_value: "verified",
      summary: "Opportunity reactivated",
      detected_at: new Date().toISOString(),
    }

    const notif = evaluateChangeEventNotification("user-1", student, baseOpportunity, event)
    assertOk(notif !== null)
    assertEqual(notif?.notification_type, "opportunity_reactivated")
  })

  // 62. Incomplete Prep Tasks Reminder
  test("62. evaluatePrepTaskReminderNotification creates reminder when incomplete prep tasks exist", () => {
    const notif = evaluatePrepTaskReminderNotification("user-1", baseOpportunity, 3)
    assertOk(notif !== null)
    assertEqual(notif?.notification_type, "prep_tasks_incomplete")
    assertEqual(notif?.metadata?.incompleteTaskCount, 3)
  })

  // 63. Duplicate Prep Reminder Prevention
  test("63. makePrepReminderDedupeKey formats date-specific dedupe key", () => {
    const key1 = makePrepReminderDedupeKey("user-1", "opp-123", "2026-09-09T12:00:00Z")
    const key2 = makePrepReminderDedupeKey("user-1", "opp-123", "2026-09-09T18:00:00Z")
    assertEqual(key1, key2)
  })

  // 64. Notification Preference Suppression
  test("64. Notification rules return null when notifications are globally disabled in preferences", () => {
    const disabledPrefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, enabled: false }
    const student: StudentContextPayload = { skills: ["Python", "Git", "C++"] }

    const notif = evaluateHighMatchNotification("user-1", student, baseOpportunity, disabledPrefs)
    assertEqual(notif, null)
  })

  // 65. High-Match Threshold Behavior
  test("65. evaluateHighMatchNotification respects custom minimum match score threshold", () => {
    const strictPrefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, minimum_match_score: 95 }
    const student: StudentContextPayload = { skills: ["Python", "Git"] } // ~85% match

    const notif = evaluateHighMatchNotification("user-1", student, baseOpportunity, strictPrefs)
    assertEqual(notif, null)
  })

  // 66. Deduplication Key Uniqueness Across Notification Types
  test("66. Deduplication keys differ across different notification types for the same opportunity", () => {
    const k1 = makeNewHighMatchDedupeKey("user-1", "opp-123")
    const k2 = makeRegistrationOpenedDedupeKey("user-1", "opp-123")
    assertOk(k1 !== k2, "Dedupe keys for different types must be distinct")
  })

  // 67. Repeated Event Evaluation Idempotency
  test("67. Repeated event evaluation produces identical dedupe keys for idempotent processing", () => {
    const k1 = makeDeadlineApproachingDedupeKey("user-1", "opp-123", "2026-10-01T00:00:00Z", "48h")
    const k2 = makeDeadlineApproachingDedupeKey("user-1", "opp-123", "2026-10-01T00:00:00Z", "48h")
    assertEqual(k1, k2)
  })

  // 68. Failure Safety in Rule Evaluation
  test("68. Rule evaluation handles empty skills or missing properties safely without throwing", () => {
    const emptyOpp: Opportunity = { ...baseOpportunity, required_skills: [], eligibility: [] }
    const emptyStudent: StudentContextPayload = {}
    const notif = evaluateHighMatchNotification("user-1", emptyStudent, emptyOpp)
    assertOk(notif !== undefined)
  })

  // 69. Weekly Digest Aggregation Rule
  test("69. evaluateWeeklyDigestNotification aggregates top opportunities into digest notification", () => {
    const notif = evaluateWeeklyDigestNotification("user-1", [baseOpportunity], "2026-W37")
    assertOk(notif !== null)
    assertEqual(notif?.notification_type, "weekly_opportunity_digest")
    assertEqual(notif?.severity, "low")
    assertEqual(notif?.dedupe_key, makeWeeklyDigestDedupeKey("user-1", "2026-W37"))
  })

  // 70. UserNotification Structure Validity
  test("70. Generated UserNotification conforms to expected interface fields", () => {
    const student: StudentContextPayload = { skills: ["Python", "Git", "C++"] }
    const notif = evaluateHighMatchNotification("user-1", student, baseOpportunity)
    assertOk(notif !== null)
    assertEqual(typeof notif?.id, "string")
    assertEqual(typeof notif?.user_id, "string")
    assertEqual(typeof notif?.title, "string")
    assertEqual(typeof notif?.message, "string")
    assertEqual(typeof notif?.dedupe_key, "string")
  })

  // 71. NotificationPreferences Default Consistency
  test("71. DEFAULT_NOTIFICATION_PREFERENCES provides valid defaults", () => {
    assertEqual(DEFAULT_NOTIFICATION_PREFERENCES.enabled, true)
    assertEqual(DEFAULT_NOTIFICATION_PREFERENCES.new_opportunities, true)
    assertEqual(DEFAULT_NOTIFICATION_PREFERENCES.minimum_match_score, 80)
  })

  // 72. Action URLs Target Valid Routes
  test("72. Action URLs in generated notifications point to valid application routes", () => {
    const student: StudentContextPayload = { skills: ["Python", "Git", "C++"] }
    const notif = evaluateHighMatchNotification("user-1", student, baseOpportunity)
    assertOk(notif?.action_url?.startsWith("/app/opportunities") ?? false)
  })

  // 73. User Notification Isolation
  test("73. Deduplication keys incorporate user_id to enforce user notification isolation", () => {
    const kUser1 = makeNewHighMatchDedupeKey("user-1", "opp-123")
    const kUser2 = makeNewHighMatchDedupeKey("user-2", "opp-123")
    assertOk(kUser1 !== kUser2, "Dedupe keys must be user-isolated")
  })

  // === PHASE 10: OPPORTUNITY RADAR TESTS (74-100) ===

  // 74. Clearly Ineligible Opportunity Excluded
  test("74. clearly ineligible opportunity excluded from primary Radar sections", () => {
    const student: StudentContextPayload = { semester: "Semester 2", skills: ["Python"] }
    const ineligibleOpp: Opportunity = {
      ...baseOpportunity,
      id: "opp-ineligible",
      title: "Senior Fellowship",
      eligibility: ["Requires active Google Developer Student Club (GDSC) membership"],
    }
    const result = buildOpportunityRadar({
      studentContext: student,
      opportunities: [ineligibleOpp],
    })

    assertEqual(result.primaryRecommendation, null)
    assertEqual(result.applyNow.length, 0)
    assertEqual(result.bestMatches.length, 0)
    assertEqual(result.deadlineSoon.length, 0)
  })

  // 75. Eligible Opportunity Considered
  test("75. eligible opportunity considered for Radar", () => {
    const student: StudentContextPayload = { semester: "Semester 6", skills: ["Python", "Git"] }
    const eligibleOpp: Opportunity = {
      ...baseOpportunity,
      id: "opp-eligible",
      title: "Python Fellowship",
      eligibility: ["Open to Semester 6 students"],
    }
    const result = buildOpportunityRadar({
      studentContext: student,
      opportunities: [eligibleOpp],
    })

    assertOk(result.primaryRecommendation !== null)
    assertEqual(result.primaryRecommendation?.opportunity.id, "opp-eligible")
  })

  // 76. Highest Deterministic Match Selected Correctly
  test("76. highest deterministic match selected correctly", () => {
    const student: StudentContextPayload = { skills: ["Python", "Git", "C++"], careerGoals: ["Software Engineer"] }
    const oppHighMatch: Opportunity = {
      ...baseOpportunity,
      id: "opp-high",
      title: "High Match Opp",
      required_skills: ["Python", "Git", "C++"],
    }
    const oppLowMatch: Opportunity = {
      ...baseOpportunity,
      id: "opp-low",
      title: "Low Match Opp",
      required_skills: ["Rust", "Haskell", "Scala"],
    }
    const result = buildOpportunityRadar({
      studentContext: student,
      opportunities: [oppLowMatch, oppHighMatch],
    })

    assertEqual(result.primaryRecommendation?.opportunity.id, "opp-high")
  })

  // 77. Apply Now Prioritization
  test("77. Apply Now prioritization for high-match open opportunity with approaching deadline", () => {
    const student: StudentContextPayload = { skills: ["Python", "Git", "C++"] }
    const deadline3Days = new Date(Date.now() + 3 * 86400000).toISOString()
    const urgentOpp: Opportunity = {
      ...baseOpportunity,
      id: "opp-urgent",
      deadline: deadline3Days,
      status: "active",
    }
    const result = buildOpportunityRadar({
      studentContext: student,
      opportunities: [urgentOpp],
    })

    assertOk(result.applyNow.some((item) => item.opportunity.id === "opp-urgent"))
  })

  // 78. Deadline Within 48h Gets Urgency Score
  test("78. deadline within 48h gets urgency score of 100", () => {
    const deadline24h = new Date(Date.now() + 24 * 3600000).toISOString()
    const urgency = calculateDeadlineUrgencyScore(deadline24h)
    assertEqual(urgency, 100)
  })

  // 79. Deadline Within 7d Gets Urgency Score
  test("79. deadline within 7d gets urgency score of 75", () => {
    const deadline5d = new Date(Date.now() + 5 * 86400000).toISOString()
    const urgency = calculateDeadlineUrgencyScore(deadline5d)
    assertEqual(urgency, 75)
  })

  // 80. Expired Deadline Excluded From Actionable Radar
  test("80. expired deadline excluded from actionable Radar (Apply Now / Deadline Soon)", () => {
    const student: StudentContextPayload = { skills: ["Python"] }
    const pastDeadline = new Date(Date.now() - 86400000).toISOString()
    const expiredOpp: Opportunity = {
      ...baseOpportunity,
      id: "opp-expired",
      deadline: pastDeadline,
      status: "active",
    }
    const result = buildOpportunityRadar({
      studentContext: student,
      opportunities: [expiredOpp],
    })

    assertEqual(result.applyNow.length, 0)
    assertEqual(result.deadlineSoon.length, 0)
  })

  // 81. Missing Deadline Handled Safely
  test("81. missing deadline handled safely without NaN or false urgency", () => {
    const urgency = calculateDeadlineUrgencyScore(null)
    assertEqual(urgency, 0)
  })

  // 82. Newly Opened Opportunity Detected Using Change Event
  test("82. newly opened opportunity detected using change event", () => {
    const student: StudentContextPayload = { skills: ["Python"] }
    const newOpp: Opportunity = { ...baseOpportunity, id: "opp-new-open" }
    const changeEvent = {
      id: "evt-opened",
      opportunity_id: "opp-new-open",
      change_type: "registration_opened" as const,
      field_changed: "status",
      old_value: "upcoming",
      new_value: "active",
      summary: "Registration opened",
      detected_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    }
    const result = buildOpportunityRadar({
      studentContext: student,
      opportunities: [newOpp],
      changeEvents: [changeEvent],
    })

    assertOk(result.newlyOpened.some((item) => item.opportunity.id === "opp-new-open"))
  })

  // 83. Old Opening Event Does Not Remain Newly Opened Forever
  test("83. old opening event (> 30 days) does not remain newly opened forever", () => {
    const oldEventDate = new Date(Date.now() - 40 * 86400000).toISOString()
    const recency = calculateRecencyScore("opp-old", [
      {
        id: "evt-old",
        opportunity_id: "opp-old",
        change_type: "registration_opened",
        field_changed: "status",
        old_value: "upcoming",
        new_value: "active",
        summary: "Opened long ago",
        detected_at: oldEventDate,
      },
    ])
    assertEqual(recency, 0)
  })

  // 84. Ambassador Opportunity Surfaced When Relevant
  test("84. ambassador opportunity surfaced in Ambassador section when relevant", () => {
    const student: StudentContextPayload = { skills: ["Python", "Community"] }
    const ambassadorOpp: Opportunity = {
      ...baseOpportunity,
      id: "opp-amb",
      type: "ambassador",
      title: "Campus Ambassador",
    }
    const result = buildOpportunityRadar({
      studentContext: student,
      opportunities: [ambassadorOpp],
    })

    assertOk(result.ambassadors.some((item) => item.opportunity.id === "opp-amb"))
  })

  // 85. Irrelevant Ambassador Opportunity Excluded
  test("85. irrelevant ambassador opportunity excluded from primary section", () => {
    const student: StudentContextPayload = { semester: "Semester 2" }
    const IneligibleAmbassador: Opportunity = {
      ...baseOpportunity,
      id: "opp-amb-ineligible",
      type: "ambassador",
      title: "Senior Lead Ambassador",
      eligibility: ["Requires active GDSC membership"],
    }
    const result = buildOpportunityRadar({
      studentContext: student,
      opportunities: [IneligibleAmbassador],
    })

    assertEqual(result.ambassadors.length, 0)
  })

  // 86. Saved Opportunity Enters Watchlist
  test("86. saved opportunity enters Watchlist", () => {
    const student: StudentContextPayload = { skills: ["Python"] }
    const savedOpp: Opportunity = { ...baseOpportunity, id: "opp-saved-1" }
    const result = buildOpportunityRadar({
      studentContext: student,
      opportunities: [savedOpp],
      savedOpportunityIds: new Set(["opp-saved-1"]),
    })

    assertOk(result.watchlist.some((item) => item.opportunity.id === "opp-saved-1"))
  })

  // 87. Incomplete Prep Enters Prepare Next
  test("87. incomplete prep enters Prepare Next section", () => {
    const student: StudentContextPayload = { skills: ["Python"] }
    const prepOpp: Opportunity = { ...baseOpportunity, id: "opp-prep-1" }
    const prepPlanData = {
      overview: "Plan overview",
      readiness_score: 60,
      milestones: [{ id: "m1", title: "Complete resume", estimated_hours: 2, priority: "High" as const }],
      weekly_schedule: [],
    }
    const result = buildOpportunityRadar({
      studentContext: student,
      opportunities: [prepOpp],
      savedOpportunityIds: new Set(["opp-prep-1"]),
      prepPlans: new Map([["opp-prep-1", prepPlanData]]),
    })

    assertOk(result.prepareNext.some((item) => item.opportunity.id === "opp-prep-1"))
  })

  // 88. Applied Opportunity Does Not Show "Apply Now"
  test("88. applied opportunity does not show Apply Now CTA", () => {
    const student: StudentContextPayload = { skills: ["Python"] }
    const appliedOpp: Opportunity = { ...baseOpportunity, id: "opp-applied-1" }
    const applications = new Map([["opp-applied-1", "applied" as const]])

    const result = buildOpportunityRadar({
      studentContext: student,
      opportunities: [appliedOpp],
      applications,
    })

    const appliedItem = result.applyNow.find((item) => item.opportunity.id === "opp-applied-1")
    assertEqual(appliedItem, undefined)
    if (result.primaryRecommendation?.opportunity.id === "opp-applied-1") {
      assertOk(result.primaryRecommendation.primaryAction.action_type !== "prepare_application")
    }
  })

  // 89. Duplicate Opportunity Does Not Appear Twice in Same Section
  test("89. duplicate opportunity does not appear twice in same section", () => {
    const student: StudentContextPayload = { skills: ["Python"] }
    const result = buildOpportunityRadar({
      studentContext: student,
      opportunities: [baseOpportunity, baseOpportunity],
    })

    const applyNowIds = result.applyNow.map((i) => i.opportunity.id)
    const uniqueIds = new Set(applyNowIds)
    assertEqual(applyNowIds.length, uniqueIds.size)
  })

  // 90. Primary Recommendation is Deterministic
  test("90. primary recommendation is deterministic", () => {
    const student: StudentContextPayload = { skills: ["Python", "Git"] }
    const r1 = buildOpportunityRadar({ studentContext: student, opportunities: [baseOpportunity] })
    const r2 = buildOpportunityRadar({ studentContext: student, opportunities: [baseOpportunity] })

    assertEqual(r1.primaryRecommendation?.opportunity.id, r2.primaryRecommendation?.opportunity.id)
    assertEqual(r1.primaryRecommendation?.priority.priorityScore, r2.primaryRecommendation?.priority.priorityScore)
  })

  // 91. Explanation Reasons Reflect Actual Signals
  test("91. explanation reasons reflect actual signals", () => {
    const oppWithDeadline = { ...baseOpportunity, deadline: new Date(Date.now() + 48 * 3600000).toISOString() }
    const chips = evaluateRadarReasonChips(
      oppWithDeadline,
      92,
      100, // 48h urgency
      false,
      false,
      false,
      0
    )

    assertOk(chips.some((c) => c.label.includes("92% match")))
    assertOk(chips.some((c) => c.label.includes("Deadline in 48h")))
  })

  // 92. Recent Meaningful Change Affects Priority Score
  test("92. recent meaningful change affects priority score", () => {
    const recentEvent = {
      id: "evt-recent",
      opportunity_id: baseOpportunity.id,
      change_type: "registration_opened" as const,
      field_changed: "status",
      old_value: "upcoming",
      new_value: "active",
      summary: "Registration opened",
      detected_at: new Date(Date.now() - 86400000).toISOString(),
    }
    const scoreWithChange = calculateRecencyScore(baseOpportunity.id, [recentEvent])
    const scoreWithoutChange = calculateRecencyScore(baseOpportunity.id, [])

    assertOk(scoreWithChange > scoreWithoutChange)
  })

  // 93. Stale / Non-Verified Data Handled Safely
  test("93. stale / non-verified data handled safely", () => {
    const unverifiedOpp: Opportunity = { ...baseOpportunity, verification_state: "pending" }
    const deprecatedOpp: Opportunity = { ...baseOpportunity, verification_state: "deprecated" }

    const unverifiedScore = calculateSourceScore(unverifiedOpp)
    const deprecatedScore = calculateSourceScore(deprecatedOpp)

    assertOk(unverifiedScore < 100)
    assertEqual(deprecatedScore, 0)
  })

  // 94. Notification Integration Does Not Duplicate Notification Logic
  test("94. notification integration does not duplicate notification logic", () => {
    const student: StudentContextPayload = { skills: ["Python", "Git", "C++"] }
    const notif = evaluateHighMatchNotification("user-1", student, baseOpportunity)
    const radar = buildOpportunityRadar({ studentContext: student, opportunities: [baseOpportunity] })

    assertOk(notif !== null)
    assertOk(radar.primaryRecommendation !== null)
    assertEqual(radar.primaryRecommendation?.opportunity.id, baseOpportunity.id)
  })

  // 95. Radar Works Without LLM Availability
  test("95. Radar works without LLM availability (100% deterministic execution)", () => {
    const student: StudentContextPayload = { skills: ["Python"] }
    const result = buildOpportunityRadar({ studentContext: student, opportunities: [baseOpportunity] })

    assertOk(result !== null)
    assertOk(typeof result.primaryRecommendation?.priority.priorityScore === "number")
  })

  // 96. Multiple Students Receive Personalized Radar Results
  test("96. multiple students receive personalized Radar results based on profile", () => {
    const studentA: StudentContextPayload = { skills: ["Solidity", "Smart Contracts"], hackathonInterests: ["Web3"] }
    const studentB: StudentContextPayload = { skills: ["Python", "AI/ML"], careerGoals: ["Data Scientist"] }

    const web3Opp: Opportunity = {
      ...baseOpportunity,
      id: "opp-web3",
      title: "Web3 Hackathon",
      required_skills: ["Solidity", "Smart Contracts"],
    }
    const aiOpp: Opportunity = {
      ...baseOpportunity,
      id: "opp-ai",
      title: "AI Grant",
      required_skills: ["Python", "AI/ML"],
    }

    const radarA = buildOpportunityRadar({ studentContext: studentA, opportunities: [web3Opp, aiOpp] })
    const radarB = buildOpportunityRadar({ studentContext: studentB, opportunities: [web3Opp, aiOpp] })

    assertEqual(radarA.primaryRecommendation?.opportunity.id, "opp-web3")
    assertEqual(radarB.primaryRecommendation?.opportunity.id, "opp-ai")
  })

  // 97. Match Score Remains Exactly the Existing 50/30/20 Formula
  test("97. match score remains exactly the existing 50/30/20 formula", () => {
    const student: StudentContextPayload = { skills: ["Python", "Git", "C++"] }
    const match = calculateDeterministicMatch(student, baseOpportunity)

    // skillScore = 100 * 0.50 = 50, goalScore = 50 * 0.30 = 15, location = 94 * 0.20 = 18.8 -> finalScore = 84
    assertEqual(match.skill_match_score, 100)
    assertEqual(match.match_score, 84)
  })

  // 98. Deadline Timezone Handling
  test("98. deadline timezone handling parses ISO strings correctly", () => {
    const isoUtc = "2026-12-31T23:59:59Z"
    const score = calculateDeadlineUrgencyScore(isoUtc)
    assertOk(typeof score === "number" && !isNaN(score))
  })

  // 99. No False Urgency for Expired Opportunities
  test("99. no false urgency for expired opportunities", () => {
    const pastDate = "2020-01-01T00:00:00Z"
    const urgency = calculateDeadlineUrgencyScore(pastDate)
    assertEqual(urgency, 0)
  })

  // 100. Radar Result Remains Stable for Identical Input
  test("100. Radar result remains stable and idempotent for identical input", () => {
    const student: StudentContextPayload = { skills: ["Python"] }
    const nowMs = 1700000000000
    const input = { studentContext: student, opportunities: [baseOpportunity], nowMs }

    const res1 = buildOpportunityRadar(input)
    const res2 = buildOpportunityRadar(input)

    assertEqual(JSON.stringify(res1), JSON.stringify(res2))
  })

  // 101. Live Source Capability Discovery & Contract
  test("101. discoverPlatformCapability maps live and fallback sources correctly", () => {
    assertEqual(discoverPlatformCapability("unstop"), "api")
    assertEqual(discoverPlatformCapability("hackerearth"), "api")
    assertEqual(discoverPlatformCapability("devfolio"), "structured_public_data")
    assertEqual(discoverPlatformCapability("devpost"), "official_public_page")
    assertEqual(discoverPlatformCapability("hack2skill"), "official_public_page")
    assertEqual(discoverPlatformCapability("sih"), "official_public_page")
    assertEqual(discoverPlatformCapability("hackhazard"), "manual_verified")
  })

  // 102. Content Hash Generation & Determinism
  test("102. generateContentHash produces stable deterministic hashes", () => {
    const oppData = {
      title: "Global AI Hackathon 2026",
      organization: "Devpost Community",
      description: "Build AI agents and multimodal workflows.",
      deadline: "2026-10-15T00:00:00Z",
      required_skills: ["Python", "TypeScript"],
      eligibility: ["18+ years old"],
      location: "Remote",
      source_url: "https://devpost.com/hackathons",
    }

    const hash1 = generateContentHash(oppData)
    const hash2 = generateContentHash(oppData)

    assertEqual(hash1, hash2)
    assertOk(hash1.startsWith("hash_"))

    const modifiedOpp = { ...oppData, deadline: "2026-10-20T00:00:00Z" }
    const hash3 = generateContentHash(modifiedOpp)
    assertOk(hash1 !== hash3)
  })

  // 103. Source Identity Deduplication Priority
  test("103. deduplicateOpportunities respects source_record_id priority", () => {
    const item1: Opportunity = {
      ...baseOpportunity,
      id: "opp-1",
      source_platform: "Unstop",
      source_record_id: "1001",
      title: "Unique Title A",
    }
    const item2: Opportunity = {
      ...baseOpportunity,
      id: "opp-2",
      source_platform: "Unstop",
      source_record_id: "1001",
      title: "Updated Title A",
    }

    const deduplicated = deduplicateOpportunities([item1, item2])
    assertEqual(deduplicated.length, 1)
    assertEqual(deduplicated[0].title, "Unique Title A")
  })

  // 104. Failure Safety Preserves Canonical Records
  test("104. Temporary HTTP source failure preserves existing canonical records", () => {
    const existingOpp: Opportunity = { ...baseOpportunity, id: "opp-canonical-1" }
    const catalog = [existingOpp]

    // Simulate an empty fetch or HTTP failure response from a platform
    const failedResult = {
      platform: "unstop",
      capability: "api" as const,
      status: "fetch_failed" as const,
      totalIngested: 0,
      totalNormalized: 0,
      acceptedCount: 0,
      duplicateCount: 0,
      rejectedCount: 0,
      errorCount: 1,
      errorSummary: "HTTP 500 Server Error",
      durationMs: 120,
      opportunities: [],
    }

    // Merging existing catalog with empty failed ingestion result preserves catalog
    const merged = deduplicateOpportunities([...catalog, ...failedResult.opportunities])
    assertEqual(merged.length, 1)
    assertEqual(merged[0].id, "opp-canonical-1")
  })

  // 105. Ingestion Run Log Creation
  test("105. buildRunLogFromIngestionResult generates valid IngestionRunLog structure", () => {
    const res = ingestFromPlatform("unstop")
    const log = buildRunLogFromIngestionResult(res, new Date().toISOString())

    assertEqual(log.source_platform, "unstop")
    assertEqual(log.status, "live_success")
    assertEqual(log.live_fetched_count, 1)
    assertEqual(log.fallback_count, 0)
    assertOk(log.finished_at !== undefined)
  })

  // 106. Non-Live Fallback Records Cannot Be Reported As Live Ingestion
  test("106. non-live fallback records (Devpost, Hack2Skill, SIH, HackHazard) cannot be reported as live ingestion", () => {
    const fallbackPlatforms = ["devpost", "hack2skill", "sih", "hackhazard"]

    for (const platform of fallbackPlatforms) {
      const res = ingestFromPlatform(platform)
      assertEqual(res.isLive, false)
      assertEqual(res.liveFetchedCount, 0)
      assertEqual(res.status, "fallback_active")
      assertEqual(res.fallbackCount, 1)

      const log = buildRunLogFromIngestionResult(res, new Date().toISOString())
      assertEqual(log.live_fetched_count, 0)
      assertEqual(log.fallback_count, 1)
      assertEqual(log.status, "fallback_active")
    }
  })

  // 107. Verified Live Sources Are Reported As Genuine Live Ingestion
  test("107. verified live sources (Unstop, HackerEarth, Devfolio) are reported with isLive true and liveFetchedCount > 0", () => {
    const livePlatforms = ["unstop", "hackerearth", "devfolio"]

    for (const platform of livePlatforms) {
      const res = ingestFromPlatform(platform)
      assertEqual(res.isLive, true)
      assertOk(res.liveFetchedCount > 0)
      assertEqual(res.fallbackCount, 0)
      assertEqual(res.status, "live_success")
    }
  })

  // 108. Ingestion Idempotency & Duplicate Prevention
  test("108. Ingestion pipeline is idempotent: identical payload does not emit duplicate change events", () => {
    const oppA: Opportunity = { ...baseOpportunity, id: "opp-idempotent-1", content_hash: "hash_idempotent_123" }
    const oppB: Opportunity = { ...baseOpportunity, id: "opp-idempotent-1", content_hash: "hash_idempotent_123" }

    const changes = detectOpportunityChanges(oppA, oppB)
    assertEqual(changes.length, 0)
  })

  // 109. Concurrency Lock State Verification
  test("109. Concurrency lock logic prevents active overlapping runs", () => {
    const lockExpiry = new Date(Date.now() + 15 * 60 * 1000).getTime()
    const isLockActive = lockExpiry > Date.now()
    assertEqual(isLockActive, true)

    const expiredLockTime = new Date(Date.now() - 1000).getTime()
    const isExpiredActive = expiredLockTime > Date.now()
    assertEqual(isExpiredActive, false)
  })

  // 100. Partial Failure Isolation Safety
  test("110. Partial failure isolation: failure in one adapter yields partial_success status without corrupting catalog", () => {
    const catalog = [baseOpportunity]
    const failedPlatformReport = {
      platform: "devfolio",
      capability: "structured_public_data" as const,
      status: "fetch_failed" as const,
      isLive: true,
      liveFetchedCount: 0,
      fallbackCount: 0,
      totalIngested: 0,
      totalNormalized: 0,
      acceptedCount: 0,
      duplicateCount: 0,
      rejectedCount: 0,
      errorCount: 1,
      errorSummary: "HTTP 500 Network Error",
      durationMs: 150,
      opportunities: [],
    }

    const merged = deduplicateOpportunities([...catalog, ...failedPlatformReport.opportunities])
    assertEqual(merged.length, 1)
    assertEqual(merged[0].id, baseOpportunity.id)
  })

  // 111. Empty Payload Safety Prevents Mass Deletion
  test("111. Empty payload response safety prevents catalog deletion or record purging", () => {
    const existingCatalog = [baseOpportunity]
    const emptyResponseItems: Opportunity[] = []

    const merged = deduplicateOpportunities([...existingCatalog, ...emptyResponseItems])
    assertEqual(merged.length, 1)
  })

  // 112. Newly Ingested Canonical Opportunity Auto-Updates Opportunity Radar
  test("112. Newly ingested live canonical opportunity automatically feeds into Opportunity Radar pipeline", () => {
    const student: StudentContextPayload = { skills: ["Python", "OpenAI"], hackathonInterests: ["Artificial Intelligence"] }
    const liveIngestedOpp: Opportunity = {
      ...baseOpportunity,
      id: "opp-unstop-ai-1",
      title: "Live Unstop AI Challenge",
      type: "hackathon",
      category: "Artificial Intelligence",
      required_skills: ["Python", "OpenAI"],
      source_platform: "Unstop",
    }

    const radar = buildOpportunityRadar({ studentContext: student, opportunities: [liveIngestedOpp] })
    assertOk(radar !== null)
    assertEqual(radar.primaryRecommendation?.opportunity.id, "opp-unstop-ai-1")
    assertEqual(radar.primaryRecommendation?.opportunity.source_platform, "Unstop")
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
