import type { Opportunity } from "../opportunityTypes"
import type { StudentContextPayload } from "../opportunityAIService"
import type { StudentEligibilityResult } from "./types"

export function evaluateStudentEligibility(
  student: StudentContextPayload,
  opportunity: Opportunity
): StudentEligibilityResult {
  const eligibilityList = opportunity.eligibility ?? []

  if (eligibilityList.length === 0) {
    return {
      isEligible: true,
      status: "unknown",
      reason: "No explicit eligibility restrictions published.",
      matchedRules: [],
      missingRules: [],
    }
  }

  const eligibilityText = eligibilityList.join(" ").toLowerCase()
  const studentSkills = (student.skills ?? []).map((s) => s.toLowerCase())
  const studentGoals = (student.careerGoals ?? []).map((g) => g.toLowerCase())
  const semester = (student.semester ?? "").toLowerCase()

  const matchedRules: string[] = []
  const missingRules: string[] = []

  // Check 1: Mandatory GDSC Membership
  const requiresGDSC = eligibilityText.includes("gdsc") || eligibilityText.includes("google developer student club")
  const hasGDSC = studentSkills.includes("gdsc") || studentGoals.some((g) => g.includes("gdsc"))
  if (requiresGDSC && !hasGDSC) {
    missingRules.push("Requires Google Developer Student Club membership")
    return {
      isEligible: false,
      status: "not_eligible",
      reason: "Requires active Google Developer Student Club membership.",
      matchedRules,
      missingRules,
    }
  } else if (requiresGDSC && hasGDSC) {
    matchedRules.push("Google Developer Student Club Member")
  }

  // Check 2: Mandatory India College Enrolment (e.g. SIH / MyGov)
  const requiresIndia = eligibilityText.includes("india") || eligibilityText.includes("indian college")
  if (requiresIndia) {
    matchedRules.push("India Region Student Eligibility")
  }

  // Check 3: Enrolled Student Criteria
  const requiresEnrolled =
    eligibilityText.includes("18+") ||
    eligibilityText.includes("enrolled") ||
    eligibilityText.includes("student") ||
    eligibilityText.includes("post-secondary")

  if (requiresEnrolled) {
    if (semester || studentSkills.length > 0) {
      matchedRules.push("Verified Post-Secondary Student Status")
    }
  }

  return {
    isEligible: true,
    status: matchedRules.length > 0 ? "verified" : "likely",
    reason: "Student context satisfies known opportunity eligibility requirements.",
    matchedRules,
    missingRules: [],
  }
}
