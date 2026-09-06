import type { Opportunity } from "../opportunityTypes"
import { normalizeSkill } from "../skillNormalization"
import type { RawOpportunityInput } from "./types"

export function normalizeRawOpportunity(raw: RawOpportunityInput, index = 0): Opportunity {
  const normalizedTitle = raw.title.trim()
  const normalizedOrg = raw.organization.trim()
  const normalizedType = raw.type ?? "hackathon"
  const normalizedCat = raw.category?.trim() || "Hackathon & Engineering"
  const normalizedDesc = raw.description?.trim() || `${normalizedTitle} hosted by ${normalizedOrg}`

  // Normalize skills using standard skill normalization
  const normSkills = (raw.required_skills ?? []).map((s) => {
    const clean = s.trim()
    const mapped = normalizeSkill(clean)
    // Capitalize first letter of normalized term for display readability
    return mapped ? mapped.charAt(0).toUpperCase() + mapped.slice(1) : clean
  })

  // Deduplicate skills
  const uniqueSkills = Array.from(new Set(normSkills))

  const cleanEligibility = (raw.eligibility ?? [])
    .map((e) => e.trim())
    .filter((e) => e.length > 0)

  const cleanLocation = raw.location?.trim() || "Remote / Global"
  const cleanSourceUrl = raw.source_url.trim()
  const cleanSourcePlatform = raw.source_platform.trim()

  return {
    id: `opp-${cleanSourcePlatform.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${index}-${Date.now().toString(36)}`,
    title: normalizedTitle,
    organization: normalizedOrg,
    type: normalizedType,
    category: normalizedCat,
    description: normalizedDesc,
    eligibility: cleanEligibility.length > 0 ? cleanEligibility : ["Open to all developers"],
    required_skills: uniqueSkills.length > 0 ? uniqueSkills : ["Software Engineering"],
    location: cleanLocation,
    stipend_prize: raw.stipend_prize?.trim() ?? null,
    source_url: cleanSourceUrl,
    source_platform: cleanSourcePlatform,
    deadline: raw.deadline ?? null,
    application_open_date: raw.application_open_date ?? null,
    status: raw.status ?? "active",
    verification_state: raw.verification_state ?? "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}
