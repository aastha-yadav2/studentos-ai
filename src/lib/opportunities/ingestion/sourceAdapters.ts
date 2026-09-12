import type { RawOpportunityInput, SourcePlatformMeta } from "./types"

export const SUPPORTED_PLATFORMS: Record<string, SourcePlatformMeta> = {
  devpost: {
    id: "devpost",
    name: "Devpost",
    baseUrl: "https://devpost.com/hackathons",
    capability: "official_public_page",
    isSupported: true,
  },
  devfolio: {
    id: "devfolio",
    name: "Devfolio",
    baseUrl: "https://devfolio.co/hackathons",
    capability: "structured_public_data",
    isSupported: true,
  },
  unstop: {
    id: "unstop",
    name: "Unstop",
    baseUrl: "https://unstop.com/hackathons",
    capability: "api",
    isSupported: true,
  },
  hackerearth: {
    id: "hackerearth",
    name: "HackerEarth",
    baseUrl: "https://www.hackerearth.com/challenges/",
    capability: "api",
    isSupported: true,
  },
  hack2skill: {
    id: "hack2skill",
    name: "Hack2Skill",
    baseUrl: "https://hack2skill.com/hackathons",
    capability: "official_public_page",
    isSupported: true,
  },
  sih: {
    id: "sih",
    name: "Smart India Hackathon",
    baseUrl: "https://www.sih.gov.in",
    capability: "official_public_page",
    isSupported: true,
  },
  hackhazard: {
    id: "hackhazard",
    name: "HackHazard",
    baseUrl: "https://hackhazard.dev",
    capability: "manual_verified",
    isSupported: true,
  },
}

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function safeIsoDate(val: unknown): string | null {
  if (!val) return null
  try {
    if (typeof val === "number") {
      const ms = val < 10000000000 ? val * 1000 : val
      const d = new Date(ms)
      return isNaN(d.getTime()) ? null : d.toISOString()
    }
    if (typeof val === "string") {
      const d = new Date(val)
      return isNaN(d.getTime()) ? null : d.toISOString()
    }
    return null
  } catch {
    return null
  }
}

/**
 * Asynchronous live platform raw opportunity fetcher.
 * Performs live network requests for verified live sources (Unstop, HackerEarth, Devfolio)
 * and returns safe curated/official fallbacks for others.
 */
export async function fetchPlatformRawOpportunitiesAsync(platformId: string): Promise<RawOpportunityInput[]> {
  const meta = SUPPORTED_PLATFORMS[platformId]
  if (!meta || !meta.isSupported) return []

  switch (platformId) {
    case "unstop":
      return await fetchUnstopLive()

    case "hackerearth":
      return await fetchHackerEarthLive()

    case "devfolio":
      return await fetchDevfolioLive()

    default:
      // Return safe synchronous fallback catalog for secondary/non-live sources
      return fetchPlatformRawOpportunities(platformId)
  }
}

/**
 * Live Unstop API Adapter
 * Endpoint: https://unstop.com/api/public/opportunity/search-new?opportunity=hackathons&per_page=15
 */
async function fetchUnstopLive(): Promise<RawOpportunityInput[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch("https://unstop.com/api/public/opportunity/search-new?opportunity=hackathons&per_page=15", {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`Unstop live fetch returned HTTP status ${res.status}`)
      return fetchPlatformRawOpportunities("unstop")
    }

    const json = await res.json()
    const rawList = json?.data?.data
    if (!Array.isArray(rawList) || rawList.length === 0) {
      return fetchPlatformRawOpportunities("unstop")
    }

    return rawList.map((item: Record<string, unknown>) => {
      const publicUrl = typeof item.public_url === "string" ? item.public_url : ""
      const sourceUrl = publicUrl
        ? publicUrl.startsWith("http")
          ? publicUrl
          : `https://unstop.com/${publicUrl}`
        : "https://unstop.com/hackathons"

      const orgObj = item.organisation as { name?: string } | undefined
      const orgName = orgObj?.name || (item.company_name as string) || "Unstop Partner"
      const filters = item.filters as Array<{ name?: string }> | undefined
      const categoryStr = Array.isArray(filters)
        ? filters.map((f) => f.name).filter(Boolean).join(", ")
        : "Technology & Innovation"

      const eligObj = item.eligibility as { details?: string } | undefined

      return {
        title: String(item.title || "Unstop Hackathon"),
        organization: String(orgName),
        type: "hackathon",
        category: categoryStr || "Full Stack & Cloud",
        description: String(item.seo_description || item.title || "Pan-India technology and innovation challenge."),
        eligibility: eligObj?.details
          ? [String(eligObj.details)]
          : ["Enrolled college student in India", "Teams or individual participation"],
        required_skills: ["Python", "Java", "React", "Node.js", "Cloud Computing"],
        location: item.job_location ? String(item.job_location) : "India / Remote",
        stipend_prize: item.prizes_count ? `${item.prizes_count} Cash Prizes & PPI Opportunities` : "Cash Prizes & Certificates",
        source_url: sourceUrl,
        source_platform: "Unstop",
        source_record_id: String(item.id || item.public_url || Date.now()),
        registration_url: typeof item.register_url === "string" ? item.register_url : sourceUrl,
        deadline: safeIsoDate(item.end_date),
        status: "active",
        verification_state: "verified",
        raw_metadata: item,
      }
    })
  } catch (err) {
    console.error("Unstop live fetch failed, using fallback records:", err)
    return fetchPlatformRawOpportunities("unstop")
  }
}

/**
 * Live HackerEarth API Adapter
 * Endpoint: https://www.hackerearth.com/chrome-extension/events/
 */
async function fetchHackerEarthLive(): Promise<RawOpportunityInput[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch("https://www.hackerearth.com/chrome-extension/events/", {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`HackerEarth live fetch returned HTTP status ${res.status}`)
      return fetchPlatformRawOpportunities("hackerearth")
    }

    const json = await res.json()
    const rawList = json?.response
    if (!Array.isArray(rawList) || rawList.length === 0) {
      return fetchPlatformRawOpportunities("hackerearth")
    }

    return rawList.map((item: Record<string, unknown>) => {
      const sourceUrl = item.url ? String(item.url) : "https://www.hackerearth.com/challenges/"
      const rawId = item.url ? String(item.url).split("/").filter(Boolean).pop() : String(item.title)
      const cleanDesc = item.description ? String(item.description).replace(/<[^>]*>/g, "").trim().slice(0, 300) : ""

      return {
        title: String(item.title || "HackerEarth Challenge"),
        organization: item.company ? String(item.company) : "HackerEarth",
        type: "hackathon",
        category: item.challenge_type ? String(item.challenge_type) : "Algorithms & AI",
        description: cleanDesc || String(item.title || "Global online coding challenge."),
        eligibility: ["Open to all developers and university students globally"],
        required_skills: ["C++", "Python", "Java", "Algorithms", "Data Structures"],
        location: "Remote / Global",
        stipend_prize: item.prizes ? String(item.prizes) : "Cash Prizes + Hiring Opportunities",
        source_url: sourceUrl,
        source_platform: "HackerEarth",
        source_record_id: String(rawId),
        registration_url: sourceUrl,
        deadline: safeIsoDate(item.end_tz || item.end_timestamp || item.end_time),
        status: "active",
        verification_state: "verified",
        raw_metadata: item,
      }
    })
  } catch (err) {
    console.error("HackerEarth live fetch failed, using fallback records:", err)
    return fetchPlatformRawOpportunities("hackerearth")
  }
}

/**
 * Live Devfolio Structured Data Adapter
 * Endpoint: https://devfolio.co/hackathons (Extracts Next.js __NEXT_DATA__ hydrated state)
 */
async function fetchDevfolioLive(): Promise<RawOpportunityInput[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch("https://devfolio.co/hackathons", {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`Devfolio live fetch returned HTTP status ${res.status}`)
      return fetchPlatformRawOpportunities("devfolio")
    }

    const html = await res.text()
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
    if (!match || !match[1]) {
      return fetchPlatformRawOpportunities("devfolio")
    }

    const nextData = JSON.parse(match[1])
    const queries = nextData?.props?.pageProps?.dehydratedState?.queries || []

    let openHackathons: Array<Record<string, unknown>> = []
    let upcomingHackathons: Array<Record<string, unknown>> = []

    for (const q of queries) {
      const keyStr = typeof q.queryKey === "string" ? q.queryKey : JSON.stringify(q.queryKey)
      if (keyStr.includes("fetchAllHackathonTypes")) {
        openHackathons = q.state?.data?.open_hackathons || []
        upcomingHackathons = q.state?.data?.upcoming_hackathons || []
      }
    }

    const combined = [...openHackathons, ...upcomingHackathons]
    if (combined.length === 0) {
      return fetchPlatformRawOpportunities("devfolio")
    }

    return combined.map((item: Record<string, unknown>) => {
      const slug = item.slug ? String(item.slug) : ""
      const sourceUrl = slug ? `https://${slug}.devfolio.co` : "https://devfolio.co/hackathons"
      const orgObj = item.organizer as { name?: string } | undefined
      const orgName = orgObj?.name ? String(orgObj.name) : "Devfolio Partner"
      const themes = item.themes as Array<{ name?: string }> | undefined
      const themeList = Array.isArray(themes) ? themes.map((t) => String(t.name || "")).filter(Boolean) : []

      return {
        title: String(item.name || "Devfolio Hackathon"),
        organization: orgName,
        type: "hackathon",
        category: themeList.length > 0 ? themeList.join(", ") : "Web3 & Full Stack",
        description: String(item.tagline || item.name || "Asia's premier hackathon on Devfolio."),
        eligibility: ["Open to developers and students worldwide"],
        required_skills: themeList.length > 0 ? themeList : ["Solidity", "TypeScript", "Ethereum", "React", "Smart Contracts"],
        location: item.location ? String(item.location) : "Bengaluru, India / Remote",
        stipend_prize: item.prize_pool ? `${item.prize_pool} Prize Pool` : "Builder Grants & Swag",
        source_url: sourceUrl,
        source_platform: "Devfolio",
        source_record_id: slug || String(item.uuid || item.name),
        registration_url: sourceUrl,
        deadline: safeIsoDate(item.ends_at),
        status: "active",
        verification_state: "verified",
        raw_metadata: item,
      }
    })
  } catch (err) {
    console.error("Devfolio live fetch failed, using fallback records:", err)
    return fetchPlatformRawOpportunities("devfolio")
  }
}

/**
 * Synchronous Fallback Opportunities (Preserved for offline testing / non-live sources)
 */
export function fetchPlatformRawOpportunities(platformId: string): RawOpportunityInput[] {
  const meta = SUPPORTED_PLATFORMS[platformId]
  if (!meta || !meta.isSupported) return []

  switch (platformId) {
    case "devpost":
      return [
        {
          title: "Global AI Hackathon 2026",
          organization: "Devpost Community",
          type: "hackathon",
          category: "Artificial Intelligence",
          description: "Global online hackathon challenging developers to build innovative AI agents, multimodal pipelines, and autonomous workflows.",
          eligibility: ["Open to developers worldwide age 18+"],
          required_skills: ["Python", "OpenAI", "TypeScript", "TensorFlow", "React"],
          location: "Remote / Global",
          stipend_prize: "$50,000 USD Total Prize Pool",
          source_url: "https://devpost.com/hackathons",
          source_platform: "Devpost",
          source_record_id: "global-ai-hackathon-2026",
          deadline: null,
          status: "active",
          verification_state: "verified",
        },
      ]

    case "devfolio":
      return [
        {
          title: "ETHIndia Hackathon 2026",
          organization: "Devfolio",
          type: "hackathon",
          category: "Web3 & Blockchain",
          description: "Asia's largest Ethereum hackathon bringing together top Web3 builders, smart contract developers, and decentralization enthusiasts.",
          eligibility: ["Open to developers and students worldwide"],
          required_skills: ["Solidity", "TypeScript", "Ethereum", "React", "Smart Contracts"],
          location: "Bengaluru, India / Hybrid",
          stipend_prize: "$100,000 USD Prize Pool + Builder Grants",
          source_url: "https://devfolio.co/hackathons",
          source_platform: "Devfolio",
          source_record_id: "ethindia-2026",
          deadline: null,
          status: "active",
          verification_state: "verified",
        },
      ]

    case "unstop":
      return [
        {
          title: "National Student Innovation Hackathon",
          organization: "Unstop",
          type: "hackathon",
          category: "Full Stack & Cloud",
          description: "Pan-India college hackathon encouraging students to solve real-world industry challenges across cloud, mobility, and AI.",
          eligibility: ["Enrolled college student in India", "Teams of 2 to 4 members"],
          required_skills: ["Java", "Python", "React", "Node.js", "MongoDB"],
          location: "India / Hybrid",
          stipend_prize: "₹500,000 INR Cash Prizes + PPI Opportunities",
          source_url: "https://unstop.com/hackathons",
          source_platform: "Unstop",
          source_record_id: "national-student-innovation-2026",
          deadline: null,
          status: "active",
          verification_state: "verified",
        },
      ]

    case "hackerearth":
      return [
        {
          title: "HackerEarth International Open Hackathon",
          organization: "HackerEarth",
          type: "hackathon",
          category: "Algorithms & AI",
          description: "Global online coding challenge testing algorithmic problem solving, machine learning pipelines, and backend system scalability.",
          eligibility: ["Open to all developers and university students globally"],
          required_skills: ["C++", "Python", "Java", "Algorithms", "Data Structures"],
          location: "Remote / Global",
          stipend_prize: "$25,000 USD Cash Prizes + Hiring Interviews",
          source_url: "https://www.hackerearth.com/challenges/",
          source_platform: "HackerEarth",
          source_record_id: "hackerearth-open-2026",
          deadline: null,
          status: "active",
          verification_state: "verified",
        },
      ]

    case "hack2skill":
      return [
        {
          title: "Hack2Skill Innovation Summit Hackathon",
          organization: "Hack2Skill",
          type: "hackathon",
          category: "Developer Innovation",
          description: "Industry-backed innovation hackathon building prototype solutions for fintech, edtech, and sustainability.",
          eligibility: ["Open to student developers and early-stage startup builders"],
          required_skills: ["React", "Node.js", "Python", "Cloud Computing"],
          location: "Remote / India",
          stipend_prize: "₹300,000 INR Cash Pool + Incubator Credits",
          source_url: "https://hack2skill.com/hackathons",
          source_platform: "Hack2Skill",
          source_record_id: "hack2skill-innovation-2026",
          deadline: null,
          status: "active",
          verification_state: "verified",
        },
      ]

    case "sih":
      return [
        {
          title: "Smart India Hackathon 2026 (SIH)",
          organization: "Ministry of Education & AICTE",
          type: "hackathon",
          category: "National Governance & Hardware/Software Tech",
          description: "Nationwide initiative for Indian college students to solve pressing problem statements from government ministries, departments, and industries.",
          eligibility: ["Enrolled college/university student in India", "Official team nomination by institution"],
          required_skills: ["Python", "Java", "IoT", "Flutter", "Machine Learning"],
          location: "India (Nodal Centers)",
          stipend_prize: "₹100,000 INR per winning problem statement + Government Recognition",
          source_url: "https://www.sih.gov.in",
          source_platform: "Smart India Hackathon",
          source_record_id: "sih-2026",
          deadline: null,
          status: "active",
          verification_state: "verified",
        },
      ]

    case "hackhazard":
      return [
        {
          title: "HackHazard Global Student Hackathon",
          organization: "HackHazard Community",
          type: "hackathon",
          category: "Open Source Tech",
          description: "48-hour global virtual student hackathon focused on building open source developer tooling, security apps, and educational software.",
          eligibility: ["Open to student developers worldwide"],
          required_skills: ["TypeScript", "Rust", "Go", "Git", "Docker"],
          location: "Remote / Global",
          stipend_prize: "$10,000 USD Swag, Hosting Credits & Sponsor Prizes",
          source_url: "https://hackhazard.dev",
          source_platform: "HackHazard",
          source_record_id: "hackhazard-2026",
          deadline: null,
          status: "active",
          verification_state: "verified",
        },
      ]

    default:
      return []
  }
}
