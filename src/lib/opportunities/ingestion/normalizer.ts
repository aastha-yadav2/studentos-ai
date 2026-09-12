import type { Opportunity } from "../opportunityTypes"
import { normalizeSkill } from "../skillNormalization"
import type { RawOpportunityInput } from "./types"

export function generateContentHash(data: {
  title: string
  organization: string
  description: string
  deadline?: string | null
  required_skills: string[]
  eligibility: string[]
  location: string
  source_url: string
  registration_url?: string | null
  stipend_prize?: string | null
}): string {
  const payload = [
    data.title.toLowerCase().trim(),
    data.organization.toLowerCase().trim(),
    data.description.toLowerCase().trim(),
    data.deadline ?? "",
    [...data.required_skills].sort().join(","),
    [...data.eligibility].sort().join(","),
    data.location.toLowerCase().trim(),
    data.source_url.toLowerCase().trim(),
    (data.registration_url ?? "").toLowerCase().trim(),
    (data.stipend_prize ?? "").toLowerCase().trim(),
  ].join("|")

  let hash = 0x811c9dc5
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return `hash_${(hash >>> 0).toString(16)}`
}

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
  const cleanRegistrationUrl = raw.registration_url?.trim() || cleanSourceUrl
  const sourceRecordId = raw.source_record_id?.trim() || null

  const contentHash =
    raw.content_hash ||
    generateContentHash({
      title: normalizedTitle,
      organization: normalizedOrg,
      description: normalizedDesc,
      deadline: raw.deadline ?? null,
      required_skills: uniqueSkills,
      eligibility: cleanEligibility,
      location: cleanLocation,
      source_url: cleanSourceUrl,
      registration_url: cleanRegistrationUrl,
      stipend_prize: raw.stipend_prize?.trim() ?? null,
    })

  return {
    id: `opp-${cleanSourcePlatform.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${sourceRecordId || index}`,
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
    source_record_id: sourceRecordId,
    registration_url: cleanRegistrationUrl,
    content_hash: contentHash,
    deadline: raw.deadline ?? null,
    application_open_date: raw.application_open_date ?? null,
    status: raw.status ?? "active",
    verification_state: raw.verification_state ?? "verified",
    first_seen_at: new Date().toISOString(),
    last_ingested_at: new Date().toISOString(),
    ingestion_status: "active",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}
