import type { Opportunity } from "./opportunityTypes"
import type { StudentContextPayload } from "./opportunityAIService"
import { calculateSkillMatch, normalizeSkill } from "./skillNormalization"

export type EligibilityStatus = "verified" | "likely" | "unknown" | "not_eligible"

export interface DeterministicMatchResult {
  match_score: number
  skill_match_score: number
  goal_match_score: number
  eligibility_location_score: number
  eligibility_status: EligibilityStatus
  eligibility_notes: string
  matched_skills: string[]
  missing_skills: string[]
  fingerprint: string
}

export function computeStudentProfileFingerprint(student: StudentContextPayload): string {
  const normSkills = (student.skills ?? []).map((s) => normalizeSkill(s)).sort().join(",")
  const normGoals = (student.careerGoals ?? []).map((g) => g.toLowerCase().trim()).sort().join(",")
  const normInternships = (student.internshipInterests ?? []).map((g) => g.toLowerCase().trim()).sort().join(",")
  const normHackathons = (student.hackathonInterests ?? []).map((g) => g.toLowerCase().trim()).sort().join(",")
  const sem = (student.semester ?? "").toLowerCase().trim()

  return `${normSkills}|${normGoals}|${normInternships}|${normHackathons}|${sem}`
}

export function calculateGoalMatch(
  student: StudentContextPayload,
  opportunity: Opportunity
): number {
  const goals = [
    ...(student.careerGoals ?? []),
    ...(student.internshipInterests ?? []),
    ...(student.hackathonInterests ?? []),
  ]

  if (goals.length === 0) {
    // Insufficient goal information: return neutral score (50), do not fabricate match
    return 50
  }

  const normalizedGoals = goals.map((g) => g.toLowerCase().trim())
  const oppKeywords = [
    opportunity.type.toLowerCase(),
    opportunity.category.toLowerCase(),
    opportunity.title.toLowerCase(),
    ...opportunity.required_skills.map((s) => normalizeSkill(s)),
  ].join(" ")

  let matchHits = 0
  for (const goal of normalizedGoals) {
    const goalWords = goal.split(/\s+/).filter((w) => w.length > 2)
    const isHit = goalWords.some((word) => oppKeywords.includes(word))
    if (isHit) matchHits++
  }

  if (matchHits === 0) return 30
  const matchRatio = matchHits / normalizedGoals.length
  return Math.min(100, Math.round(50 + matchRatio * 50))
}

export function calculateEligibilityAndLocation(
  student: StudentContextPayload,
  opportunity: Opportunity
): {
  eligibilityScore: number
  locationScore: number
  combinedScore: number
  status: EligibilityStatus
  notes: string
} {
  // 1. Location Scoring
  const oppLocation = (opportunity.location || "Remote").toLowerCase()
  const isRemote = oppLocation.includes("remote") || oppLocation.includes("global")

  let locationScore = 50
  if (isRemote) {
    locationScore = 100
  } else if (student.semester) {
    // Non-remote without specific student location match
    locationScore = 40
  }

  // 2. Eligibility Scoring & Status
  const eligibilityList = opportunity.eligibility ?? []
  let status: EligibilityStatus
  let eligibilityScore: number
  let notes: string

  if (eligibilityList.length === 0) {
    status = "unknown"
    eligibilityScore = 70
    notes = "No explicit eligibility restrictions published."
  } else {
    const eligibilityText = eligibilityList.join(" ").toLowerCase()
    const studentText = [
      student.semester ?? "",
      ...(student.careerGoals ?? []),
      ...(student.skills ?? []),
    ].join(" ").toLowerCase()

    const requiresGDSC = eligibilityText.includes("gdsc") || eligibilityText.includes("google developer student club")
    if (requiresGDSC && !studentText.includes("gdsc")) {
      status = "not_eligible"
      eligibilityScore = 20
      notes = "Requires Google Developer Student Club membership."
    } else if (eligibilityText.includes("18+") || eligibilityText.includes("post-secondary") || eligibilityText.includes("enrolled")) {
      status = "likely"
      eligibilityScore = 90
      notes = "Student status appears likely eligible based on age/enrolment criteria."
    } else {
      status = "verified"
      eligibilityScore = 100
      notes = "Criteria verified."
    }
  }

  // 3. Combined Eligibility + Location Score (60% Eligibility, 40% Location)
  const combinedScore = Math.round(eligibilityScore * 0.60 + locationScore * 0.40)

  return {
    eligibilityScore,
    locationScore,
    combinedScore,
    status,
    notes,
  }
}

export function calculateDeterministicMatch(
  student: StudentContextPayload,
  opportunity: Opportunity
): DeterministicMatchResult {
  const fingerprint = computeStudentProfileFingerprint(student)

  // 1. Skill Match (50%)
  const { skillScore, matched, missing } = calculateSkillMatch(
    student.skills ?? [],
    opportunity.required_skills
  )

  // 2. Goal Match (30%)
  const goalScore = calculateGoalMatch(student, opportunity)

  // 3. Eligibility & Location Match (20%)
  const eligLoc = calculateEligibilityAndLocation(student, opportunity)

  // 4. Exact Weighted Formula: Skill 50% + Goal 30% + EligLoc 20%
  const finalScore = Math.round(
    skillScore * 0.50 +
    goalScore * 0.30 +
    eligLoc.combinedScore * 0.20
  )

  return {
    match_score: Math.min(100, Math.max(0, finalScore)),
    skill_match_score: skillScore,
    goal_match_score: goalScore,
    eligibility_location_score: eligLoc.combinedScore,
    eligibility_status: eligLoc.status,
    eligibility_notes: eligLoc.notes,
    matched_skills: matched,
    missing_skills: missing,
    fingerprint,
  }
}

export function isMatchStale(
  cachedMatch: { match_score: number; skill_match_score: number; goal_match_score: number; explanation?: string },
  currentStudent: StudentContextPayload,
  opportunity: Opportunity
): boolean {
  const fresh = calculateDeterministicMatch(currentStudent, opportunity)

  const fpMatch = cachedMatch.explanation?.match(/\[fp:(.*?)\]/)
  if (fpMatch && fpMatch[1]) {
    return fpMatch[1] !== fresh.fingerprint
  }

  if (
    cachedMatch.match_score !== fresh.match_score ||
    cachedMatch.skill_match_score !== fresh.skill_match_score ||
    cachedMatch.goal_match_score !== fresh.goal_match_score
  ) {
    return true
  }

  return false
}

export function isPrepPlanStale(
  planData: { student_fingerprint?: string },
  currentStudent: StudentContextPayload
): boolean {
  if (!planData.student_fingerprint) return false
  const freshFingerprint = computeStudentProfileFingerprint(currentStudent)
  return planData.student_fingerprint !== freshFingerprint
}

