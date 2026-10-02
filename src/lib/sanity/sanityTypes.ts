export interface SanityOrganization {
  _id: string
  name: string
  slug: { current: string }
  website?: string
  description?: string
  industry?: string
}

export interface SanitySkill {
  _id: string
  name: string
  slug: { current: string }
  category?: string
  aliases?: string[]
  description?: string
}

export interface SanityEligibilityRule {
  _id: string
  ruleType: "academic" | "age" | "location" | "skills" | "affiliation" | "general"
  description: string
  required: boolean
  degree?: string[]
  year?: string[]
  location?: string
  skills?: SanitySkill[]
}

export interface SanitySelectionStage {
  stageName: string
  description: string
}

export interface SanityApplicationProcess {
  _id: string
  title: string
  steps: string[]
  documents?: string[]
  selectionStages?: SanitySelectionStage[]
  estimatedEffort?: string
}

export interface SanityResource {
  _id: string
  title: string
  type?: "guide" | "template" | "video" | "repo" | "handbook"
  url?: string
  skills?: SanitySkill[]
  description?: string
}

export interface SanitySource {
  _id: string
  name: string
  url: string
  sourceType?: string
  verifiedAt?: string
  notes?: string
}

export interface SanityOpportunityKnowledge {
  _id: string
  title: string
  slug: { current: string }
  organization: SanityOrganization
  type: string
  category: string
  description: string
  eligibility: SanityEligibilityRule[]
  requiredSkills: SanitySkill[]
  location?: string
  remote?: boolean
  deadline?: string
  applicationOpenDate?: string
  eventStartDate?: string
  eventEndDate?: string
  teamSizeMin?: number
  teamSizeMax?: number
  stipendPrize?: string
  applicationProcess?: SanityApplicationProcess
  resources?: SanityResource[]
  source?: SanitySource
  verificationState: "verified" | "pending" | "deprecated"
  lastVerifiedAt?: string
  officialUrl?: string
  applicationUrl?: string
  knowledgeBaseNotes?: string
  isFallback?: boolean
}
