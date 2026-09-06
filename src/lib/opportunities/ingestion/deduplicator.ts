import type { Opportunity } from "../opportunityTypes"

export function deduplicateOpportunities(opportunities: Opportunity[]): Opportunity[] {
  const seenUrls = new Set<string>()
  const seenFuzzyKeys = new Set<string>()
  const result: Opportunity[] = []

  for (const opp of opportunities) {
    // 1. Exact URL deduplication
    const urlKey = `${opp.source_platform.toLowerCase()}|${opp.source_url.toLowerCase().replace(/\/$/, "")}`
    if (seenUrls.has(urlKey)) {
      continue
    }
    seenUrls.add(urlKey)

    // 2. Cross-platform fuzzy title + org deduplication
    const cleanTitle = opp.title.toLowerCase().replace(/[^a-z0-9]/g, "")
    const cleanOrg = opp.organization.toLowerCase().replace(/[^a-z0-9]/g, "")
    const fuzzyKey = `${cleanTitle}_${cleanOrg}`

    if (fuzzyKey.length > 5 && seenFuzzyKeys.has(fuzzyKey)) {
      continue
    }
    seenFuzzyKeys.add(fuzzyKey)

    result.push(opp)
  }

  return result
}
