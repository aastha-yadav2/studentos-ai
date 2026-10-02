import { createClient } from "@sanity/client"
import type { SanityOpportunityKnowledge } from "./sanityTypes"
import { SANITY_FALLBACK_KNOWLEDGE } from "./sanityFallbackData"

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID
const dataset = import.meta.env.VITE_SANITY_DATASET || "production"

// Initialize read-only client safely without exposing private tokens
export const sanityClient = projectId
  ? createClient({
      projectId,
      dataset,
      useCdn: true,
      apiVersion: "2024-03-01",
    })
  : null

export const OPPORTUNITY_KNOWLEDGE_GROQ_QUERY = `*[_type == "opportunity" && (id == $oppId || slug.current == $oppId || _id == $oppId)][0]{
  _id,
  title,
  slug,
  type,
  category,
  description,
  location,
  remote,
  deadline,
  applicationOpenDate,
  eventStartDate,
  eventEndDate,
  teamSizeMin,
  teamSizeMax,
  stipendPrize,
  verificationState,
  lastVerifiedAt,
  officialUrl,
  applicationUrl,
  knowledgeBaseNotes,
  organization->{
    _id,
    name,
    slug,
    website,
    description,
    industry
  },
  eligibility[]->{
    _id,
    ruleType,
    description,
    required,
    degree,
    year,
    location,
    skills[]->{ _id, name, slug, category, aliases, description }
  },
  requiredSkills[]->{
    _id,
    name,
    slug,
    category,
    aliases,
    description
  },
  applicationProcess->{
    _id,
    title,
    steps,
    documents,
    selectionStages,
    estimatedEffort
  },
  resources[]->{
    _id,
    title,
    type,
    url,
    skills[]->{ _id, name, slug, category },
    description
  },
  source->{
    _id,
    name,
    url,
    sourceType,
    verifiedAt,
    notes
  }
}`

export async function getSanityOpportunityKnowledge(
  opportunityIdOrSlug: string
): Promise<SanityOpportunityKnowledge | null> {
  const normId = opportunityIdOrSlug.trim()

  // 1. Try querying Sanity if configured
  if (sanityClient) {
    try {
      const data: SanityOpportunityKnowledge | null = await sanityClient.fetch(
        OPPORTUNITY_KNOWLEDGE_GROQ_QUERY,
        { oppId: normId }
      )
      if (data) {
        return {
          ...data,
          isFallback: false,
        }
      }
    } catch (err) {
      console.warn("Sanity GROQ fetch failed, using demo fallback knowledge:", err)
    }
  }

  // 2. Demo fallback / offline resilience for hackathon evaluation
  const fallback = SANITY_FALLBACK_KNOWLEDGE[normId] || SANITY_FALLBACK_KNOWLEDGE["opp-gsoc"]
  if (fallback) {
    return {
      ...fallback,
      isFallback: true,
    }
  }

  return null
}
