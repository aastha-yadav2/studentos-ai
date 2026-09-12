import type { Opportunity } from "../opportunityTypes"
import { normalizeRawOpportunity } from "./normalizer"
import { deduplicateOpportunities } from "./deduplicator"
import { evaluateStudentEligibility } from "./eligibilityExtractor"
import {
  fetchPlatformRawOpportunities,
  fetchPlatformRawOpportunitiesAsync,
  SUPPORTED_PLATFORMS,
} from "./sourceAdapters"
import type { IngestionResult, IngestionRunLog, SourceCapability, StudentEligibilityResult } from "./types"
import type { StudentContextPayload } from "../opportunityAIService"

const VERIFIED_LIVE_PLATFORMS = new Set(["unstop", "hackerearth", "devfolio"])

export function discoverPlatformCapability(platformId: string): SourceCapability {
  const meta = SUPPORTED_PLATFORMS[platformId]
  return meta ? meta.capability : "unsupported"
}

export function ingestFromPlatform(platformId: string): IngestionResult {
  const startTime = Date.now()
  const capability = discoverPlatformCapability(platformId)
  const isLivePlatform = VERIFIED_LIVE_PLATFORMS.has(platformId)
  const rawItems = fetchPlatformRawOpportunities(platformId)

  const normalized = rawItems.map((raw, idx) => normalizeRawOpportunity(raw, idx))
  const deduplicated = deduplicateOpportunities(normalized)
  const rejectedCount = Math.max(0, rawItems.length - normalized.length)
  const duplicateCount = Math.max(0, normalized.length - deduplicated.length)

  const liveFetchedCount = isLivePlatform ? rawItems.length : 0
  const fallbackCount = isLivePlatform ? 0 : rawItems.length
  const status = isLivePlatform
    ? rawItems.length > 0
      ? "live_success"
      : "empty_success"
    : "fallback_active"

  return {
    platform: platformId,
    capability,
    status,
    isLive: isLivePlatform,
    liveFetchedCount,
    fallbackCount,
    totalIngested: liveFetchedCount,
    totalNormalized: normalized.length,
    acceptedCount: deduplicated.length,
    duplicateCount,
    rejectedCount,
    errorCount: 0,
    durationMs: Date.now() - startTime,
    opportunities: deduplicated,
  }
}

export async function ingestFromPlatformAsync(platformId: string): Promise<IngestionResult> {
  const startTime = Date.now()
  const capability = discoverPlatformCapability(platformId)
  const isLivePlatform = VERIFIED_LIVE_PLATFORMS.has(platformId)

  try {
    const rawItems = await fetchPlatformRawOpportunitiesAsync(platformId)
    const normalized = rawItems.map((raw, idx) => normalizeRawOpportunity(raw, idx))
    const deduplicated = deduplicateOpportunities(normalized)
    const rejectedCount = Math.max(0, rawItems.length - normalized.length)
    const duplicateCount = Math.max(0, normalized.length - deduplicated.length)

    const liveFetchedCount = isLivePlatform ? rawItems.length : 0
    const fallbackCount = isLivePlatform ? 0 : rawItems.length
    const status = isLivePlatform
      ? rawItems.length > 0
        ? "live_success"
        : "empty_success"
      : "fallback_active"

    return {
      platform: platformId,
      capability,
      status,
      isLive: isLivePlatform,
      liveFetchedCount,
      fallbackCount,
      totalIngested: liveFetchedCount,
      totalNormalized: normalized.length,
      acceptedCount: deduplicated.length,
      duplicateCount,
      rejectedCount,
      errorCount: 0,
      durationMs: Date.now() - startTime,
      opportunities: deduplicated,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      platform: platformId,
      capability,
      status: "fetch_failed",
      isLive: isLivePlatform,
      liveFetchedCount: 0,
      fallbackCount: 0,
      totalIngested: 0,
      totalNormalized: 0,
      acceptedCount: 0,
      duplicateCount: 0,
      rejectedCount: 0,
      errorCount: 1,
      errorSummary: errorMsg,
      durationMs: Date.now() - startTime,
      opportunities: [],
    }
  }
}

export function buildRunLogFromIngestionResult(res: IngestionResult, startedAtISO: string): IngestionRunLog {
  return {
    source_platform: res.platform,
    started_at: startedAtISO,
    finished_at: new Date().toISOString(),
    status: res.status,
    fetched_count: res.liveFetchedCount,
    live_fetched_count: res.liveFetchedCount,
    fallback_count: res.fallbackCount,
    normalized_count: res.totalNormalized,
    accepted_count: res.acceptedCount,
    duplicate_count: res.duplicateCount,
    rejected_count: res.rejectedCount,
    error_count: res.errorCount,
    error_summary: res.errorSummary ?? null,
    metadata: {
      capability: res.capability,
      isLive: res.isLive,
      durationMs: res.durationMs,
    },
  }
}

export function runMultiSourceIngestionPipeline(): Opportunity[] {
  const allOpportunities: Opportunity[] = []

  for (const platformId of Object.keys(SUPPORTED_PLATFORMS)) {
    const result = ingestFromPlatform(platformId)
    allOpportunities.push(...result.opportunities)
  }

  return deduplicateOpportunities(allOpportunities)
}

export async function runMultiSourceIngestionPipelineAsync(): Promise<{
  opportunities: Opportunity[]
  reports: IngestionResult[]
}> {
  const reports: IngestionResult[] = []
  const allOpportunities: Opportunity[] = []

  for (const platformId of Object.keys(SUPPORTED_PLATFORMS)) {
    const result = await ingestFromPlatformAsync(platformId)
    reports.push(result)
    allOpportunities.push(...result.opportunities)
  }

  return {
    opportunities: deduplicateOpportunities(allOpportunities),
    reports,
  }
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
