import { createClient } from "@sanity/client"
import type { SanityOpportunityKnowledge } from "./sanityTypes"
import { SANITY_FALLBACK_KNOWLEDGE } from "./sanityFallbackData"
import type { Opportunity } from "../opportunities/opportunityTypes"

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

export const TITLE_GROQ_QUERY = `*[_type == "opportunity" && (lower(title) == $normTitle || title match $normTitle)][0]{
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

export function generateGenericOpportunityFallback(opportunity: Opportunity): SanityOpportunityKnowledge {
  const isRemote = (opportunity.location || "").toLowerCase().includes("remote") || (opportunity.location || "").toLowerCase().includes("global")

  return {
    _id: `fallback-${opportunity.id}`,
    title: opportunity.title,
    slug: { current: opportunity.id },
    organization: {
      _id: `org-gen-${opportunity.id}`,
      name: opportunity.organization,
      slug: { current: opportunity.organization.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      website: opportunity.source_url,
      description: `${opportunity.organization} official program overview and guidelines.`,
      industry: opportunity.category || "Technology",
    },
    type: opportunity.type,
    category: opportunity.category,
    description: opportunity.description,
    eligibility: (opportunity.eligibility && opportunity.eligibility.length > 0
      ? opportunity.eligibility
      : ["General eligibility criteria as published by organizer."]
    ).map((ruleText, idx) => ({
      _id: `elig-gen-${opportunity.id}-${idx}`,
      ruleType: "general",
      description: ruleText,
      required: true,
    })),
    requiredSkills: (opportunity.required_skills && opportunity.required_skills.length > 0
      ? opportunity.required_skills
      : ["Software Engineering", "Problem Solving"]
    ).map((skillName, idx) => ({
      _id: `skill-gen-${opportunity.id}-${idx}`,
      name: skillName,
      slug: { current: skillName.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      category: "general",
    })),
    location: opportunity.location || "Remote / Online",
    remote: isRemote,
    stipendPrize: opportunity.stipend_prize ?? undefined,
    applicationProcess: {
      _id: `proc-gen-${opportunity.id}`,
      title: `${opportunity.title} Application Pipeline`,
      steps: [
        `Review official requirements for ${opportunity.title} at ${opportunity.organization}.`,
        "Prepare application portfolio and project evidence.",
        "Submit final application materials via official program portal.",
      ],
      documents: ["Resume / CV", "Portfolio / Project Repository", "Application Form"],
      selectionStages: [
        { stageName: "Application Review", description: `Initial screening for ${opportunity.title}.` },
        { stageName: "Final Evaluation", description: "Selection and onboarding." },
      ],
      estimatedEffort: "Standard application review process",
    },
    resources: [
      {
        _id: `res-gen-${opportunity.id}`,
        title: `${opportunity.organization} Official Portal`,
        type: "guide",
        url: opportunity.source_url,
        description: `Official website and guidelines for ${opportunity.title}.`,
      },
    ],
    source: {
      _id: `src-gen-${opportunity.id}`,
      name: `${opportunity.organization} Portal`,
      url: opportunity.source_url,
      sourceType: "official_website",
    },
    verificationState: opportunity.verification_state || "verified",
    officialUrl: opportunity.source_url,
    applicationUrl: opportunity.registration_url || opportunity.source_url,
    knowledgeBaseNotes: `Opportunity-specific fallback generated for ${opportunity.title}.`,
    isFallback: true,
  }
}

export async function getSanityOpportunityKnowledge(
  opportunityIdOrSlug: string,
  opportunityTitle?: string,
  opportunityObj?: Opportunity
): Promise<SanityOpportunityKnowledge | null> {
  const normId = opportunityIdOrSlug.trim()
  const normTitle = opportunityTitle?.trim().toLowerCase()

  if (import.meta.env.DEV) {
    console.info(`[Sanity Knowledge Lookup] Requested ID/Slug: "${normId}", Title: "${opportunityTitle ?? 'N/A'}"`, {
      projectId,
      dataset,
    })
  }

  // 1. Try querying Sanity if configured
  if (sanityClient) {
    try {
      let data: SanityOpportunityKnowledge | null = await sanityClient.fetch(
        OPPORTUNITY_KNOWLEDGE_GROQ_QUERY,
        { oppId: normId }
      )

      if (!data && normTitle) {
        data = await sanityClient.fetch(TITLE_GROQ_QUERY, { normTitle })
      }

      // DEFENSIVE IDENTITY VALIDATION LAYER
      if (data) {
        const matchesId = data._id === normId || data.slug?.current === normId
        const matchesTitle = normTitle
          ? data.title.toLowerCase().trim() === normTitle ||
            data.title.toLowerCase().includes(normTitle) ||
            normTitle.includes(data.title.toLowerCase().trim())
          : true

        const isValidIdentity = matchesId || matchesTitle

        if (import.meta.env.DEV) {
          console.info(`[Sanity GROQ Query] Success (200 OK). Returned Document ID: "${data._id}", Title: "${data.title}". Identity Validation: ${isValidIdentity ? 'PASSED' : 'FAILED'}`)
        }

        if (isValidIdentity) {
          return {
            ...data,
            isFallback: false,
          }
        } else {
          if (import.meta.env.DEV) {
            console.warn(
              `[Identity Validation] Rejected returned Sanity document. Requested "${normId}" ("${opportunityTitle}"), but Sanity returned "${data._id}" ("${data.title}"). Reason: Identity mismatch.`
            )
          }
        }
      } else {
        if (import.meta.env.DEV) {
          console.info(`[Sanity GROQ Query] No document returned for "${normId}" ("${opportunityTitle}") in dataset "${dataset}".`)
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("Sanity GROQ fetch failed, using opportunity-specific fallback knowledge:", err)
      }
    }
  } else {
    if (import.meta.env.DEV) {
      console.info(`[Sanity Client Unconfigured] VITE_SANITY_PROJECT_ID is not set. Using fallback.`)
    }
  }

  // 2. Strict static fallback lookup by ID, slug, or title match
  const staticFallback =
    SANITY_FALLBACK_KNOWLEDGE[normId] ||
    Object.values(SANITY_FALLBACK_KNOWLEDGE).find(
      (f) =>
        f.slug?.current === normId ||
        (normTitle && f.title.toLowerCase().trim() === normTitle)
    )

  if (staticFallback) {
    if (import.meta.env.DEV) {
      console.info(`[Sanity Fallback] Using matching static fallback for "${normId}" ("${staticFallback.title}").`)
    }
    return {
      ...staticFallback,
      isFallback: true,
    }
  }

  // 3. Dynamic generic fallback constructed STRICTLY from the selected opportunity's metadata
  if (opportunityObj) {
    if (import.meta.env.DEV) {
      console.info(`[Sanity Fallback] Generating generic fallback for "${opportunityObj.id}" ("${opportunityObj.title}").`)
    }
    return generateGenericOpportunityFallback(opportunityObj)
  }

  return null
}
