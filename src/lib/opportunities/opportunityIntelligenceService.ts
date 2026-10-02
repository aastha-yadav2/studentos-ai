import type { Session } from "@supabase/supabase-js"
import { requestAI } from "@/lib/ai/router-client"
import type { Opportunity } from "./opportunityTypes"
import type { StudentContextPayload } from "./opportunityAIService"
import { calculateDeterministicMatch } from "./deterministicMatcher"
import { getSanityOpportunityKnowledge } from "@/lib/sanity/sanityOpportunityService"
import type { SanityOpportunityKnowledge } from "@/lib/sanity/sanityTypes"

export interface OpportunityIntelligenceResult {
  opportunityId: string
  verdict: string
  eligibility: {
    status: "eligible" | "not_eligible" | "uncertain"
    satisfied: string[]
    blockers: string[]
    notes: string[]
  }
  skillMatch: {
    matched: string[]
    gaps: string[]
  }
  readiness: {
    strengths: string[]
    gaps: string[]
    priorityActions: string[]
  }
  applicationPlan: {
    steps: string[]
    documents: string[]
    preparation: string[]
  }
  resources: {
    title: string
    url?: string
    type?: string
  }[]
  explanation: string
  isFallbackKnowledge?: boolean
  computedAt: string
}

interface RawAIResponse {
  content: string
}

export async function generateOpportunityIntelligence({
  session,
  opportunity,
  studentContext,
}: {
  session: Session | null
  opportunity: Opportunity
  studentContext: StudentContextPayload
}): Promise<OpportunityIntelligenceResult> {
  // 1. Fetch structured Sanity knowledge
  const sanityKnowledge = await getSanityOpportunityKnowledge(opportunity.id)

  // 2. Compute authoritative deterministic match
  const deterministic = calculateDeterministicMatch(studentContext, opportunity)

  // 3. Determine hard eligibility facts hierarchy
  let hardEligibilityStatus: "eligible" | "not_eligible" | "uncertain"
  if (deterministic.eligibility_status === "not_eligible") {
    hardEligibilityStatus = "not_eligible"
  } else if (deterministic.eligibility_status === "verified" || deterministic.eligibility_status === "likely") {
    hardEligibilityStatus = "eligible"
  } else {
    hardEligibilityStatus = "uncertain"
  }

  // 4. Extract structured lists from Sanity knowledge or opportunity fallbacks
  const sanityEligibilityList = sanityKnowledge?.eligibility ?? []
  const sanityAppProcess = sanityKnowledge?.applicationProcess
  const sanityResources = sanityKnowledge?.resources ?? []

  const satisfiedEligibility: string[] = []
  const blockerEligibility: string[] = []

  if (hardEligibilityStatus === "not_eligible") {
    blockerEligibility.push(deterministic.eligibility_notes || "Does not satisfy mandatory eligibility requirements.")
  } else {
    satisfiedEligibility.push(deterministic.eligibility_notes || "Satisfies basic program criteria.")
  }

  sanityEligibilityList.forEach((rule) => {
    if (rule.required && hardEligibilityStatus === "not_eligible") {
      if (!blockerEligibility.includes(rule.description)) {
        blockerEligibility.push(rule.description)
      }
    } else {
      if (!satisfiedEligibility.includes(rule.description)) {
        satisfiedEligibility.push(rule.description)
      }
    }
  })

  // Grounded AI Request Payload
  const payload = {
    opportunity: {
      id: opportunity.id,
      title: opportunity.title,
      organization: opportunity.organization,
      type: opportunity.type,
      category: opportunity.category,
      description: opportunity.description,
      required_skills: opportunity.required_skills,
      stipend_prize: opportunity.stipend_prize,
    },
    sanity_knowledge: sanityKnowledge
      ? {
          organization: sanityKnowledge.organization?.name,
          eligibility_rules: sanityKnowledge.eligibility?.map((r) => r.description),
          application_steps: sanityKnowledge.applicationProcess?.steps,
          documents_required: sanityKnowledge.applicationProcess?.documents,
          resources: sanityKnowledge.resources?.map((r) => ({ title: r.title, url: r.url })),
          verification: sanityKnowledge.verificationState,
        }
      : null,
    student_context: {
      skills: studentContext.skills ?? [],
      career_goals: studentContext.careerGoals ?? [],
      semester: studentContext.semester ?? "Semester 6",
    },
    deterministic_facts: {
      match_score: deterministic.match_score,
      skill_match_score: deterministic.skill_match_score,
      goal_match_score: deterministic.goal_match_score,
      hard_eligibility_status: hardEligibilityStatus,
      matched_skills: deterministic.matched_skills,
      missing_skills: deterministic.missing_skills,
      eligibility_notes: deterministic.eligibility_notes,
    },
    instructions: `You are the StudentOS Opportunity Intelligence Agent. Evaluate if the student is ready for this opportunity.
STRICT RULE: The deterministic hard eligibility status is "${hardEligibilityStatus}". You MUST NOT state the student is eligible if hard eligibility is "not_eligible".
Return JSON with this EXACT structure:
{
  "verdict": "Clear 1-sentence readiness verdict",
  "explanation": "Detailed 2-3 sentence explanation grounded in student profile and Sanity requirements",
  "strengths": ["list of candidate strengths"],
  "gaps": ["list of skill or profile gaps"],
  "priorityActions": ["list of 3 concrete next steps"],
  "preparation": ["list of preparation milestones"]
}`,
  }

  // Default fallback result if AI fails
  const fallbackResult: OpportunityIntelligenceResult = {
    opportunityId: opportunity.id,
    verdict:
      hardEligibilityStatus === "not_eligible"
        ? `Not currently eligible: ${deterministic.eligibility_notes}`
        : `${deterministic.match_score}% Fit score computed based on ${deterministic.matched_skills.length} matched skills and goal alignment.`,
    eligibility: {
      status: hardEligibilityStatus,
      satisfied: satisfiedEligibility.length > 0 ? satisfiedEligibility : ["General enrolment status"],
      blockers: blockerEligibility,
      notes: [deterministic.eligibility_notes],
    },
    skillMatch: {
      matched: deterministic.matched_skills,
      gaps: deterministic.missing_skills,
    },
    readiness: {
      strengths: deterministic.strengths.length > 0 ? deterministic.strengths : ["Technical foundation"],
      gaps: deterministic.gaps,
      priorityActions:
        deterministic.missing_skills.length > 0
          ? deterministic.missing_skills.slice(0, 3).map((s) => `Build project experience in ${s}`)
          : ["Review program guidelines and prepare resume"],
    },
    applicationPlan: {
      steps: sanityAppProcess?.steps ?? [
        "Review official documentation and eligibility guidelines.",
        "Prepare application materials and portfolio proof.",
        "Submit final application before deadline.",
      ],
      documents: sanityAppProcess?.documents ?? ["Resume / CV", "GitHub Portfolio", "Application Form"],
      preparation: [
        `Master required technical skills: ${opportunity.required_skills.join(", ") || "core stack"}`,
        "Polish repository documentation and code samples",
        "Prepare application statement of purpose",
      ],
    },
    resources: sanityResources.map((r) => ({
      title: r.title,
      url: r.url,
      type: r.type,
    })),
    explanation: `${deterministic.explanation} Grounded in Sanity knowledge layer and deterministic 50/30/20 fit calculation.`,
    isFallbackKnowledge: sanityKnowledge?.isFallback ?? true,
    computedAt: new Date().toISOString(),
  }

  try {
    const aiRes = await requestAI<RawAIResponse>(session, "opportunity_intelligence", payload)
    const parsed = JSON.parse(aiRes.data.content)

    return {
      opportunityId: opportunity.id,
      verdict:
        hardEligibilityStatus === "not_eligible"
          ? `Not Eligible: ${deterministic.eligibility_notes}`
          : parsed.verdict || fallbackResult.verdict,
      eligibility: {
        status: hardEligibilityStatus, // STRICT AUTHORITY: Cannot be overridden by LLM
        satisfied: satisfiedEligibility,
        blockers: blockerEligibility,
        notes: [deterministic.eligibility_notes],
      },
      skillMatch: {
        matched: deterministic.matched_skills,
        gaps: deterministic.missing_skills,
      },
      readiness: {
        strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : fallbackResult.readiness.strengths,
        gaps: Array.isArray(parsed.gaps) && parsed.gaps.length > 0 ? parsed.gaps : fallbackResult.readiness.gaps,
        priorityActions: Array.isArray(parsed.priorityActions) && parsed.priorityActions.length > 0 ? parsed.priorityActions : fallbackResult.readiness.priorityActions,
      },
      applicationPlan: {
        steps: sanityAppProcess?.steps ?? fallbackResult.applicationPlan.steps,
        documents: sanityAppProcess?.documents ?? fallbackResult.applicationPlan.documents,
        preparation: Array.isArray(parsed.preparation) && parsed.preparation.length > 0 ? parsed.preparation : fallbackResult.applicationPlan.preparation,
      },
      resources: sanityResources.map((r) => ({
        title: r.title,
        url: r.url,
        type: r.type,
      })),
      explanation: parsed.explanation || fallbackResult.explanation,
      isFallbackKnowledge: sanityKnowledge?.isFallback ?? true,
      computedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.warn("AI intelligence reasoning offline/failed, returning deterministic Sanity result:", error)
    return fallbackResult
  }
}

export async function askOpportunityFollowUp({
  session,
  opportunity,
  studentContext,
  sanityKnowledge,
  intelligenceResult,
  question,
}: {
  session: Session | null
  opportunity: Opportunity
  studentContext: StudentContextPayload
  sanityKnowledge: SanityOpportunityKnowledge | null
  intelligenceResult: OpportunityIntelligenceResult
  question: string
}): Promise<{ answer: string; suggestedActions?: string[] }> {
  const payload = {
    question,
    opportunity: {
      title: opportunity.title,
      organization: opportunity.organization,
      type: opportunity.type,
      description: opportunity.description,
    },
    sanity_knowledge: sanityKnowledge
      ? {
          eligibility: sanityKnowledge.eligibility?.map((e) => e.description),
          application_steps: sanityKnowledge.applicationProcess?.steps,
          documents: sanityKnowledge.applicationProcess?.documents,
          resources: sanityKnowledge.resources?.map((r) => r.title),
        }
      : null,
    student: {
      skills: studentContext.skills ?? [],
      semester: studentContext.semester ?? "Semester 6",
    },
    intelligence_verdict: intelligenceResult.verdict,
    eligibility_status: intelligenceResult.eligibility.status,
    matched_skills: intelligenceResult.skillMatch.matched,
    missing_skills: intelligenceResult.skillMatch.gaps,
    instructions:
      "Answer the student's question directly, accurately, and grounded strictly in the provided opportunity knowledge and student profile. Return JSON: { answer: string, suggestedActions: string[] }",
  }

  try {
    const aiRes = await requestAI<RawAIResponse>(session, "opportunity_qa", payload)
    const parsed = JSON.parse(aiRes.data.content)
    return {
      answer: parsed.answer || "Based on the structured opportunity knowledge, make sure your application highlights your relevant skills and meets all published deadlines.",
      suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
    }
  } catch (error) {
    console.warn("Grounded follow-up Q&A AI request offline, returning deterministic answer:", error)
    return {
      answer: `Regarding "${question}": For ${opportunity.title} at ${opportunity.organization}, ensure you meet the required skills (${opportunity.required_skills.join(", ")}) and complete all application steps outlined in the readiness plan.`,
      suggestedActions: ["Review required skills", "Check official application portal"],
    }
  }
}
