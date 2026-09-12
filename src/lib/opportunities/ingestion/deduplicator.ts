import type { Opportunity } from "../opportunityTypes"

export function deduplicateOpportunities(opportunities: Opportunity[]): Opportunity[] {
  const seenSourceRecordIds = new Set<string>()
  const seenUrls = new Set<string>()
  const seenFuzzyKeys = new Set<string>()
  const result: Opportunity[] = []

  for (const opp of opportunities) {
    // 1. Stable Source Identity (Platform + Source Record ID)
    if (opp.source_record_id) {
      const recordKey = `${opp.source_platform.toLowerCase()}|${opp.source_record_id.toLowerCase()}`
      if (seenSourceRecordIds.has(recordKey)) {
        continue
      }
      seenSourceRecordIds.add(recordKey)
    }

    // 2. Exact Canonical URL Deduplication
    const cleanUrl = opp.source_url.toLowerCase().replace(/\/$/, "")
    const urlKey = `${opp.source_platform.toLowerCase()}|${cleanUrl}`
    if (seenUrls.has(urlKey)) {
      continue
    }
    seenUrls.add(urlKey)

    // 3. Cross-platform Safe Fuzzy Title + Org Deduplication
    const cleanTitle = opp.title.toLowerCase().replace(/[^a-z0-9]/g, "")
    const cleanOrg = opp.organization.toLowerCase().replace(/[^a-z0-9]/g, "")
    const fuzzyKey = `${cleanTitle}_${cleanOrg}`

    if (cleanTitle.length > 5 && seenFuzzyKeys.has(fuzzyKey)) {
      continue
    }
    seenFuzzyKeys.add(fuzzyKey)

    result.push(opp)
  }

  return result
}
