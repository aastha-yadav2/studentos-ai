import type { Session } from "@supabase/supabase-js"
import { requestAI } from "@/lib/ai/router-client"
import type { Opportunity, OpportunityMatch, OpportunityPrepPlanData } from "./opportunityTypes"
import { saveOpportunityMatch, saveOpportunityPrepPlan } from "./opportunityService"
import { calculateDeterministicMatch, computeStudentProfileFingerprint, type EligibilityStatus } from "./deterministicMatcher"

export interface StudentContextPayload {
  skills?: string[]
  careerGoals?: string[]
  semester?: string
  internshipInterests?: string[]
  hackathonInterests?: string[]
}

interface RawAIMatchResponse {
  content: string
}

interface MatchAIExplanationJSON {
  strengths?: string[]
  missing_skills?: string[]
  explanation: string
}

export interface ComprehensiveMatchResult extends OpportunityMatch {
  eligibility_status: EligibilityStatus
  eligibility_notes: string
  eligibility_location_score: number
  gaps?: string[]
  recommended_actions?: string[]
}

export async function computeOpportunityMatch(
  session: Session | null,
  userId: string,
  opportunity: Opportunity,
  studentContext: StudentContextPayload
): Promise<ComprehensiveMatchResult | null> {
  // 1. COMPUTED DETERMINISTICALLY IN TYPESCRIPT (LLM CANNOT INFLUENCE THESE SCORES)
  const deterministic = calculateDeterministicMatch(studentContext, opportunity)

  const payload = {
    opportunity: {
      title: opportunity.title,
      organization: opportunity.organization,
      type: opportunity.type,
      category: opportunity.category,
      description: opportunity.description,
      eligibility: opportunity.eligibility,
      required_skills: opportunity.required_skills,
    },
    student: {
      skills: studentContext.skills ?? [],
      career_goals: studentContext.careerGoals ?? [],
      semester: studentContext.semester ?? "Unspecified",
    },
    deterministic_scores: {
      match_score: deterministic.match_score,
      skill_match_score: deterministic.skill_match_score,
      goal_match_score: deterministic.goal_match_score,
      eligibility_location_score: deterministic.eligibility_location_score,
      matched_skills: deterministic.matched_skills,
      missing_skills: deterministic.missing_skills,
    },
    instructions:
      "Review the student context and deterministic match scores provided. DO NOT generate numeric scores. Provide a 2-3 sentence qualitative explanation and list key strengths. Return JSON: { explanation: string, strengths: string[], missing_skills: string[] }",
  }

  let qualitativeExplanation = `Deterministic match score of ${deterministic.match_score}% calculated based on Skill Fit (${deterministic.skill_match_score}%), Goal Alignment (${deterministic.goal_match_score}%), and Eligibility/Location (${deterministic.eligibility_location_score}%). AI qualitative reasoning is temporarily offline.`
  let strengths = deterministic.matched_skills.length > 0 ? deterministic.matched_skills : ["Relevant technical background"]
  let missingSkills = deterministic.missing_skills

  try {
    const result = await requestAI<RawAIMatchResponse>(session, "opportunity_match", payload)
    const aiData: MatchAIExplanationJSON = JSON.parse(result.data.content)
    if (aiData.explanation && aiData.explanation.trim()) {
      qualitativeExplanation = aiData.explanation.trim()
    }
    if (Array.isArray(aiData.strengths) && aiData.strengths.length > 0) {
      strengths = aiData.strengths
    }
    if (Array.isArray(aiData.missing_skills)) {
      missingSkills = aiData.missing_skills
    }
  } catch (error) {
    console.warn("AI router qualitative explanation failed, falling back to deterministic explanation:", error)
  }

  // Append fingerprint annotation for reliable cache invalidation without DB schema changes
  const explanationWithFP = `${qualitativeExplanation}\n\n[fp:${deterministic.fingerprint}]`

  // 2. PERSIST THE EXACT DETERMINISTIC SCORES (LLM IS IGNORED FOR NUMERIC VALUES)
  const matchRecord = {
    user_id: userId,
    opportunity_id: opportunity.id,
    match_score: deterministic.match_score,
    skill_match_score: deterministic.skill_match_score,
    goal_match_score: deterministic.goal_match_score,
    strengths,
    missing_skills: missingSkills,
    explanation: explanationWithFP,
  }

  const saved = await saveOpportunityMatch(matchRecord)
  if (!saved) return null

  return {
    ...saved,
    eligibility_status: deterministic.eligibility_status,
    eligibility_notes: deterministic.eligibility_notes,
    eligibility_location_score: deterministic.eligibility_location_score,
  }
}

export async function generateOpportunityPrepPlan(
  session: Session | null,
  userId: string,
  opportunity: Opportunity,
  studentContext: StudentContextPayload
): Promise<OpportunityPrepPlanData | null> {
  const currentFingerprint = computeStudentProfileFingerprint(studentContext)

  const payload = {
    opportunity: {
      title: opportunity.title,
      organization: opportunity.organization,
      type: opportunity.type,
      category: opportunity.category,
      description: opportunity.description,
      required_skills: opportunity.required_skills,
    },
    student: {
      skills: studentContext.skills ?? [],
      career_goals: studentContext.careerGoals ?? [],
      semester: studentContext.semester ?? "Unspecified",
    },
    instructions:
      "Create a highly practical, 4-week step-by-step preparation plan for this student to win or secure this opportunity. Return JSON: { summary: string, readiness_assessment: string, recommended_projects: string[], key_milestones: [{ week: string, title: string, focus: string, action_items: string[] }], recommended_resources: string[] }",
  }

  try {
    const result = await requestAI<RawAIMatchResponse>(session, "opportunity_prep_plan", payload)
    const rawPlanData: OpportunityPrepPlanData = JSON.parse(result.data.content)
    const planData: OpportunityPrepPlanData = {
      ...rawPlanData,
      student_fingerprint: currentFingerprint,
    }

    await saveOpportunityPrepPlan({
      user_id: userId,
      opportunity_id: opportunity.id,
      plan: planData,
    })

    return planData
  } catch (error) {
    console.error("Failed to generate AI prep plan:", error)

    const fallbackPlan: OpportunityPrepPlanData = {
      summary: `4-Week Preparation Strategy for ${opportunity.title} at ${opportunity.organization}`,
      readiness_assessment: `Focus on mastering required skills: ${opportunity.required_skills.join(", ")}.`,
      recommended_projects: [`Build a portfolio project demonstrating ${opportunity.required_skills[0] ?? "core skills"}`],
      key_milestones: [
        {
          week: "Week 1",
          title: "Skill Foundations & Setup",
          focus: `Review ${opportunity.required_skills.slice(0, 2).join(" & ") || "prerequisites"}`,
          action_items: ["Review documentation", "Set up local development environment"],
        },
        {
          week: "Week 2",
          title: "Project Prototype",
          focus: "Build core feature set",
          action_items: ["Implement initial working prototype", "Commit code to GitHub"],
        },
        {
          week: "Week 3",
          title: "Refinement & Testing",
          focus: "Polish user experience and edge cases",
          action_items: ["Add automated tests", "Write clear README documentation"],
        },
        {
          week: "Week 4",
          title: "Application & Submission",
          focus: "Final review and submission",
          action_items: ["Submit application before deadline", "Prepare interview summary"],
        },
      ],
      recommended_resources: ["Official Documentation", "GitHub Example Repositories"],
      student_fingerprint: currentFingerprint,
    }

    await saveOpportunityPrepPlan({
      user_id: userId,
      opportunity_id: opportunity.id,
      plan: fallbackPlan,
    })

    return fallbackPlan
  }
}

