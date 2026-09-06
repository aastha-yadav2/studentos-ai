import type { Opportunity } from "../opportunityTypes"
import { normalizeRawOpportunity } from "./normalizer"
import { deduplicateOpportunities } from "./deduplicator"
import { evaluateStudentEligibility } from "./eligibilityExtractor"
import { fetchPlatformRawOpportunities, SUPPORTED_PLATFORMS } from "./sourceAdapters"
import type { IngestionResult, SourceCapability, StudentEligibilityResult } from "./types"
import type { StudentContextPayload } from "../opportunityAIService"

export function discoverPlatformCapability(platformId: string): SourceCapability {
  const meta = SUPPORTED_PLATFORMS[platformId]
  return meta ? meta.capability : "unsupported"
}

export function ingestFromPlatform(platformId: string): IngestionResult {
  const capability = discoverPlatformCapability(platformId)
  const rawItems = fetchPlatformRawOpportunities(platformId)

  const normalized = rawItems.map((raw, idx) => normalizeRawOpportunity(raw, idx))
  const deduplicated = deduplicateOpportunities(normalized)

  return {
    platform: platformId,
    capability,
    totalIngested: rawItems.length,
    totalNormalized: normalized.length,
    opportunities: deduplicated,
  }
}

export function runMultiSourceIngestionPipeline(): Opportunity[] {
  const allOpportunities: Opportunity[] = []

  for (const platformId of Object.keys(SUPPORTED_PLATFORMS)) {
    const result = ingestFromPlatform(platformId)
    allOpportunities.push(...result.opportunities)
  }

  // Final cross-platform deduplication run
  return deduplicateOpportunities(allOpportunities)
}

export function getEligibleHackathonsForStudent(
  student: StudentContextPayload,
  catalog: Opportunity[]
): { opportunity: Opportunity; eligibility: StudentEligibilityResult }[] {
  return catalog
    .filter((opp) => opp.type === "hackathon")
    .map((opp) => {
      const eligibility = evaluateStudentEligibility(student, opp)
      return { opportunity: opp, eligibility }
    })
    .filter(({ eligibility }) => eligibility.isEligible)
}
