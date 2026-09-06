import type { Session } from "@supabase/supabase-js"
import { requestAI } from "@/lib/ai/router-client"
import type { Opportunity, OpportunityMatch, OpportunityPrepPlanData } from "./opportunityTypes"
import { saveOpportunityMatch, saveOpportunityPrepPlan } from "./opportunityService"

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

interface MatchJSON {
  match_score: number
  skill_match_score: number
  goal_match_score: number
  strengths: string[]
  missing_skills: string[]
  explanation: string
}

export async function computeOpportunityMatch(
  session: Session | null,
  userId: string,
  opportunity: Opportunity,
  studentContext: StudentContextPayload
): Promise<OpportunityMatch | null> {
  const payload = {
    opportunity: {
      title: opportunity.title,
      organization: opportunity.organization,
      type: opportunity.type,
      category: opportunity.category,
      description: opportunity.description,
      eligibility: opportunity.eligibility,
      required_skills: opportunity.required_skills,
      stipend_prize: opportunity.stipend_prize,
    },
    student: {
      skills: studentContext.skills ?? [],
      career_goals: studentContext.careerGoals ?? [],
      semester: studentContext.semester ?? "Unspecified",
      internship_interests: studentContext.internshipInterests ?? [],
      hackathon_interests: studentContext.hackathonInterests ?? [],
    },
    instructions:
      "Analyze the fit between the student and this opportunity. Calculate integer match scores between 0 and 100 for match_score, skill_match_score, and goal_match_score. List specific strengths, missing_skills, and a 2-3 sentence explanation. Return JSON: { match_score: number, skill_match_score: number, goal_match_score: number, strengths: string[], missing_skills: string[], explanation: string }",
  }

  try {
    const result = await requestAI<RawAIMatchResponse>(session, "opportunity_match", payload)
    const matchData: MatchJSON = JSON.parse(result.data.content)

    const matchRecord = {
      user_id: userId,
      opportunity_id: opportunity.id,
      match_score: Math.min(100, Math.max(0, matchData.match_score || 70)),
      skill_match_score: Math.min(100, Math.max(0, matchData.skill_match_score || 65)),
      goal_match_score: Math.min(100, Math.max(0, matchData.goal_match_score || 75)),
      strengths: matchData.strengths || [],
      missing_skills: matchData.missing_skills || [],
      explanation: matchData.explanation || "Calculated based on your active skills and program requirements.",
    }

    return await saveOpportunityMatch(matchRecord)
  } catch (error) {
    console.error("Failed to compute AI match score:", error)

    // Fallback heuristic scoring if AI router is offline
    const studentSkills = new Set((studentContext.skills ?? []).map((s) => s.toLowerCase()))
    const requiredSkills = opportunity.required_skills.map((s) => s.toLowerCase())
    const matched = requiredSkills.filter((s) => studentSkills.has(s))
    const missing = requiredSkills.filter((s) => !studentSkills.has(s))

    const skillScore = requiredSkills.length > 0 ? Math.round((matched.length / requiredSkills.length) * 100) : 75
    const fallbackMatch = {
      user_id: userId,
      opportunity_id: opportunity.id,
      match_score: Math.max(50, skillScore),
      skill_match_score: skillScore,
      goal_match_score: 75,
      strengths: matched.length > 0 ? matched : ["Relevant technical background"],
      missing_skills: missing,
      explanation: `Matched ${matched.length} of ${requiredSkills.length} required skills based on your profile.`,
    }

    return await saveOpportunityMatch(fallbackMatch)
  }
}

export async function generateOpportunityPrepPlan(
  session: Session | null,
  userId: string,
  opportunity: Opportunity,
  studentContext: StudentContextPayload
): Promise<OpportunityPrepPlanData | null> {
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
    const planData: OpportunityPrepPlanData = JSON.parse(result.data.content)

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
    }

    await saveOpportunityPrepPlan({
      user_id: userId,
      opportunity_id: opportunity.id,
      plan: fallbackPlan,
    })

    return fallbackPlan
  }
}
