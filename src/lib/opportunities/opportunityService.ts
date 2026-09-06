import { supabase } from "@/lib/supabase"
import type {
  Opportunity,
  OpportunityMatch,
  SavedOpportunity,
  OpportunityApplication,
  OpportunityPrepPlan,
  ApplicationStatus,
} from "./opportunityTypes"
import { runMultiSourceIngestionPipeline } from "./ingestion/ingestionEngine"
import { deduplicateOpportunities } from "./ingestion/deduplicator"

export const VERIFIED_FALLBACK_OPPORTUNITIES: Opportunity[] = [
  {
    id: "opp-gsoc",
    title: "Google Summer of Code",
    organization: "Google",
    type: "fellowship",
    category: "Open Source Development",
    description: "Global online program focused on bringing new contributors into open source software development under 1-on-1 mentorship.",
    eligibility: ["18+ years old", "Enrolled in post-secondary education or beginner open-source contributor"],
    required_skills: ["Git", "Python", "C++", "Java", "Go"],
    location: "Remote",
    stipend_prize: "Stipend based on local purchasing power parity",
    source_url: "https://summerofcode.withgoogle.com",
    source_platform: "Google",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "opp-mlh",
    title: "MLH Fellowship",
    organization: "Major League Hacking",
    type: "fellowship",
    category: "Software Engineering",
    description: "A 12-week internship alternative where developers contribute to real-world open source projects used by millions.",
    eligibility: ["Proficient in at least one programming language", "Available 30-40 hours per week"],
    required_skills: ["Git", "JavaScript", "Python", "React", "Node.js"],
    location: "Remote",
    stipend_prize: "Need-based educational stipend provided",
    source_url: "https://fellowship.mlh.io",
    source_platform: "Major League Hacking",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "opp-imagine-cup",
    title: "Microsoft Imagine Cup",
    organization: "Microsoft",
    type: "competition",
    category: "AI & Cloud Innovation",
    description: "Global student technology competition inviting teams to build innovative solutions utilizing Microsoft AI and Azure services.",
    eligibility: ["Enrolled student age 18+", "Teams of up to 4 members"],
    required_skills: ["Azure", "AI/ML", "TypeScript", "Python", "Cloud Architecture"],
    location: "Remote / Global",
    stipend_prize: "$100,000 USD + Mentorship with Microsoft CEO",
    source_url: "https://imaginecup.microsoft.com",
    source_platform: "Microsoft",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "opp-ethglobal",
    title: "ETHGlobal Hackathons",
    organization: "ETHGlobal",
    type: "hackathon",
    category: "Web3 & Blockchain",
    description: "Global Ethereum hackathon series bringing together developers to build decentralized applications and smart contracts.",
    eligibility: ["Open to developers worldwide", "Individual or team entry"],
    required_skills: ["Solidity", "TypeScript", "React", "Smart Contracts", "Web3.js"],
    location: "Remote / Hybrid",
    stipend_prize: "Over $500,000 in sponsor prize pools per event",
    source_url: "https://ethglobal.com",
    source_platform: "ETHGlobal",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "opp-gdsc-solution",
    title: "Google Solution Challenge",
    organization: "Google Developer Student Clubs",
    type: "competition",
    category: "Social Impact Tech",
    description: "Annual global competition inviting students to build solutions for UN 17 Sustainable Development Goals using Google technologies.",
    eligibility: ["Member of a Google Developer Student Club at a university"],
    required_skills: ["Flutter", "Firebase", "Google Cloud", "TensorFlow", "Android"],
    location: "Remote",
    stipend_prize: "Top 3 teams receive $3,000 USD/member + Google Mentorship",
    source_url: "https://developers.google.com/community/gdsc-solution-challenge",
    source_platform: "Google",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "opp-outreachy",
    title: "Outreachy Internships",
    organization: "Outreachy",
    type: "internship",
    category: "Open Source & Software Engineering",
    description: "Paid 13-week remote internships providing open source mentorship for people subject to systemic bias and underrepresented in tech.",
    eligibility: ["18+ years old", "Available 30 hours per week during internship cohort"],
    required_skills: ["Git", "Python", "JavaScript", "Documentation", "Linux"],
    location: "Remote",
    stipend_prize: "$7,000 USD total stipend",
    source_url: "https://www.outreachy.org",
    source_platform: "Outreachy",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "opp-github-expert",
    title: "GitHub Campus Experts",
    organization: "GitHub",
    type: "ambassador",
    category: "Campus Expert",
    description: "Student leadership program providing training, public speaking, community building, and event support for technical student leaders.",
    eligibility: ["18+ years old", "Enrolled in post-secondary institution", "Completed GitHub Education training"],
    required_skills: ["Git", "GitHub", "Community Building", "Public Speaking", "Event Management"],
    location: "Remote / Global Campus",
    stipend_prize: "Event sponsorship, GitHub swag, conference travel grants",
    source_url: "https://education.github.com/experts",
    source_platform: "GitHub",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "opp-notion-leader",
    title: "Notion Campus Leader",
    organization: "Notion",
    type: "ambassador",
    category: "Campus Leader",
    description: "Student leaders building productivity communities, hosting workshops, and demonstrating Notion workflows on university campuses.",
    eligibility: ["Enrolled post-secondary student", "Active Notion user and community builder"],
    required_skills: ["Notion", "Productivity Tools", "Event Planning", "Community Building", "Workshop Facilitation"],
    location: "Remote / University Campus",
    stipend_prize: "Notion Plus subscription, exclusive swag, team mentorship",
    source_url: "https://www.notion.so/ambassadors",
    source_platform: "Notion",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "opp-postman-leader",
    title: "Postman Student Leader",
    organization: "Postman",
    type: "ambassador",
    category: "Developer Ambassador",
    description: "Student leaders educating peers on API literacy, hosting hands-on API workshops, and building developer communities.",
    eligibility: ["Verified Postman Student Expert badge holder", "Enrolled student"],
    required_skills: ["Postman", "REST APIs", "API Testing", "Public Speaking", "Developer Advocacy"],
    location: "Remote / Global",
    stipend_prize: "Event sponsorship, Postman swag, direct connection with Developer Relations team",
    source_url: "https://www.postman.com/company/student-program/",
    source_platform: "Postman",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "opp-deeplearning-ambassador",
    title: "DeepLearning.AI Event Ambassador",
    organization: "DeepLearning.AI",
    type: "ambassador",
    category: "AI Ambassador",
    description: "Community leaders organizing local Pie & AI workshops and fostering machine learning education across global student communities.",
    eligibility: ["Passionate about AI/ML education", "Experience hosting meetups or student workshops"],
    required_skills: ["Machine Learning", "Python", "Event Management", "Community Leadership", "AI/ML Education"],
    location: "Remote / Global",
    stipend_prize: "Event hosting grants, DeepLearning.AI swag, instructor Q&A access",
    source_url: "https://www.deeplearning.ai/ambassador-program/",
    source_platform: "DeepLearning.AI",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "opp-aws-student-leader",
    title: "AWS Student Community Leader",
    organization: "Amazon Web Services",
    type: "ambassador",
    category: "Campus Expert",
    description: "Student cloud leaders sharing AWS knowledge, facilitating cloud workshops, and mentoring university peers in cloud architecture.",
    eligibility: ["Enrolled post-secondary student", "AWS cloud foundational knowledge", "Student leadership experience"],
    required_skills: ["AWS", "Cloud Computing", "DevOps", "Technical Presentation", "Community Building"],
    location: "Remote / Global",
    stipend_prize: "AWS promotional credits, swag, priority access to AWS certifications & events",
    source_url: "https://aws.amazon.com/developer/community/students/",
    source_platform: "Amazon Web Services",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "opp-ms-copilot-ambassador",
    title: "Microsoft Copilot Student Ambassador",
    organization: "Microsoft",
    type: "ambassador",
    category: "AI Ambassador",
    description: "Student ambassadors leading AI adoption, demonstrating Copilot developer tools, and hosting technical sessions on campus.",
    eligibility: ["Enrolled post-secondary student age 18+", "Interest in AI development and developer tools"],
    required_skills: ["AI/ML", "TypeScript", "Python", "Public Speaking", "Developer Advocacy"],
    location: "Remote / Global",
    stipend_prize: "Microsoft credits, certification vouchers, exclusive ambassador swag",
    source_url: "https://mvp.microsoft.com/studentambassadors",
    source_platform: "Microsoft",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "opp-mygov-ambassador",
    title: "MyGov Campus Ambassador",
    organization: "MyGov India",
    type: "ambassador",
    category: "Campus Representative",
    description: "Government of India student ambassador program promoting civic digital initiatives, youth innovation, and community awareness across campuses.",
    eligibility: ["Enrolled college student in India", "Active in campus student organizations"],
    required_skills: ["Public Relations", "Social Media", "Community Leadership", "Event Planning", "Communication"],
    location: "India / University Campus",
    stipend_prize: "Official Certificate of Appreciation, MyGov merchandise, national recognition",
    source_url: "https://www.mygov.in",
    source_platform: "MyGov India",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "opp-internshala-partner",
    title: "Internshala Student Partner",
    organization: "Internshala",
    type: "ambassador",
    category: "Student Partner",
    description: "Pan-India student leadership program empowering campus leaders to promote career awareness, skill workshops, and internship opportunities.",
    eligibility: ["College student in India", "Strong communication and organizational skills"],
    required_skills: ["Communication", "Social Media", "Marketing", "Event Management", "Networking"],
    location: "India / Remote",
    stipend_prize: "Performance-based stipends, certificates, exclusive career training",
    source_url: "https://internshala.com/isp",
    source_platform: "Internshala",
    deadline: null,
    application_open_date: null,
    status: "active",
    verification_state: "verified",
    last_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const ingestedHackathons = runMultiSourceIngestionPipeline()
  const combinedFallback = deduplicateOpportunities([...VERIFIED_FALLBACK_OPPORTUNITIES, ...ingestedHackathons])

  if (!supabase) return combinedFallback
  try {
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("status", "active")
      .order("last_verified_at", { ascending: false })

    if (error || !data || data.length === 0) {
      console.warn("Using verified fallback catalog (Supabase table unpopulated or offline):", error)
      return combinedFallback
    }

    // Merge fallback ambassador & multi-source hackathons if remote DB is partially migrated
    const merged = deduplicateOpportunities([...(data as Opportunity[]), ...combinedFallback])
    return merged
  } catch (err) {
    console.error("Error fetching opportunities, using verified fallback catalog:", err)
    return combinedFallback
  }
}

export async function fetchUserSavedOpportunities(userId: string): Promise<SavedOpportunity[]> {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from("user_opportunity_saved")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching saved opportunities:", error)
    return []
  }
  return data as SavedOpportunity[]
}

export async function toggleSaveOpportunity(userId: string, opportunityId: string, isSaved: boolean): Promise<boolean> {
  if (!supabase || !userId) return false
  if (isSaved) {
    const { error } = await supabase
      .from("user_opportunity_saved")
      .delete()
      .eq("user_id", userId)
      .eq("opportunity_id", opportunityId)
    return !error
  } else {
    const { error } = await supabase
      .from("user_opportunity_saved")
      .insert({ user_id: userId, opportunity_id: opportunityId })
    return !error
  }
}

export async function fetchUserApplications(userId: string): Promise<OpportunityApplication[]> {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from("user_opportunity_applications")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching user applications:", error)
    return []
  }
  return data as OpportunityApplication[]
}

export async function updateApplicationStatus(
  userId: string,
  opportunityId: string,
  status: ApplicationStatus,
  notes?: string
): Promise<OpportunityApplication | null> {
  if (!supabase || !userId) return null
  const payload = {
    user_id: userId,
    opportunity_id: opportunityId,
    status,
    notes: notes ?? null,
    applied_at: status === "applied" ? new Date().toISOString() : null,
  }

  const { data, error } = await supabase
    .from("user_opportunity_applications")
    .upsert(payload, { onConflict: "user_id,opportunity_id" })
    .select()
    .single()

  if (error) {
    console.error("Error updating application status:", error)
    return null
  }
  return data as OpportunityApplication
}

export async function fetchUserOpportunityMatches(userId: string): Promise<OpportunityMatch[]> {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from("opportunity_matches")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching opportunity matches:", error)
    return []
  }
  return data as OpportunityMatch[]
}

export async function saveOpportunityMatch(match: Omit<OpportunityMatch, "id" | "computed_at">): Promise<OpportunityMatch | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("opportunity_matches")
    .upsert(match, { onConflict: "user_id,opportunity_id" })
    .select()
    .single()

  if (error) {
    console.error("Error saving opportunity match:", error)
    return null
  }
  return data as OpportunityMatch
}

export async function fetchUserPrepPlans(userId: string): Promise<OpportunityPrepPlan[]> {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from("opportunity_prep_plans")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching prep plans:", error)
    return []
  }
  return data as OpportunityPrepPlan[]
}

export async function saveOpportunityPrepPlan(prepPlan: Omit<OpportunityPrepPlan, "id" | "created_at" | "updated_at">): Promise<OpportunityPrepPlan | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("opportunity_prep_plans")
    .upsert(prepPlan, { onConflict: "user_id,opportunity_id" })
    .select()
    .single()

  if (error) {
    console.error("Error saving prep plan:", error)
    return null
  }
  return data as OpportunityPrepPlan
}

export async function fetchUserTaskTitles(userId: string): Promise<Set<string>> {
  if (!supabase || !userId) return new Set()
  const { data, error } = await supabase
    .from("student_tasks")
    .select("title")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching user tasks:", error)
    return new Set()
  }
  return new Set(data.map((t: { title: string }) => t.title))
}

export async function createTaskFromOpportunityMilestone(
  userId: string,
  title: string,
  priority: "High" | "Medium" | "Low" = "High",
  dueDaysOffset = 7
): Promise<boolean> {
  if (!supabase || !userId) return false
  const trimmedTitle = title.trim()

  // 1. Task Duplication Prevention (DB Level Check)
  const { data: existing } = await supabase
    .from("student_tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("title", trimmedTitle)
    .limit(1)

  if (existing && existing.length > 0) {
    // Task already exists; skip duplicate insertion safely
    return true
  }

  const dueAt = new Date()
  dueAt.setDate(dueAt.getDate() + dueDaysOffset)

  const { error } = await supabase.from("student_tasks").insert({
    user_id: userId,
    title: trimmedTitle,
    due_at: dueAt.toISOString(),
    priority,
    estimated_hours: 2,
    status: "todo",
  })

  if (error) {
    console.error("Error converting opportunity milestone to task:", error)
    return false
  }
  return true
}

export async function fetchOpportunityChangeEvents(opportunityId?: string): Promise<import("./freshness/types").OpportunityChangeEvent[]> {
  if (!supabase) return []
  let query = supabase.from("opportunity_change_events").select("*").order("detected_at", { ascending: false })
  if (opportunityId) {
    query = query.eq("opportunity_id", opportunityId)
  }
  const { data, error } = await query
  if (error) {
    console.error("Error fetching opportunity change events:", error)
    return []
  }
  return data as import("./freshness/types").OpportunityChangeEvent[]
}


