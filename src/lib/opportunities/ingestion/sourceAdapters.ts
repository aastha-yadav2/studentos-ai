import type { RawOpportunityInput, SourcePlatformMeta } from "./types"

export const SUPPORTED_PLATFORMS: Record<string, SourcePlatformMeta> = {
  devpost: {
    id: "devpost",
    name: "Devpost",
    baseUrl: "https://devpost.com/hackathons",
    capability: "structured_public_data",
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
    capability: "structured_public_data",
    isSupported: true,
  },
  hackerearth: {
    id: "hackerearth",
    name: "HackerEarth",
    baseUrl: "https://www.hackerearth.com/challenges/",
    capability: "structured_public_data",
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
          deadline: null,
          status: "active",
          verification_state: "verified",
        },
      ]

    default:
      return []
  }
}
