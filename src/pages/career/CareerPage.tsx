import { useCallback, useEffect, useState } from "react"
import { BriefcaseBusiness, CheckCircle2, Code2, ExternalLink, Loader2, Save, Sparkles, Target } from "lucide-react"
import { useAuth } from "@/auth/auth-provider"
import { supabase, supabaseConfigError } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type CareerProfile = { placementGoal: string; targetDate: string; internships: string; companies: string; skills: string }
type Roadmap = {
  title: string
  summary: string
  milestones: { timeframe: string; objective: string; actions: string[] }[]
  recommended_projects: { title: string; why_it_matters: string; skills: string[]; scope: string }[]
  learning_resources: { topic: string; resource: string; reason: string }[]
  application_strategy: string[]
}

const emptyProfile: CareerProfile = { placementGoal: "", targetDate: "", internships: "", companies: "", skills: "" }
const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean)

export function CareerPage() {
  const { session, user } = useAuth()
  const [profile, setProfile] = useState<CareerProfile>(emptyProfile)
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadCareerData = useCallback(async () => {
    if (!supabase || !user) return
    const [profileResult, roadmapResult] = await Promise.all([
      supabase.from("career_profiles").select("placement_goal,target_date,internships,companies,skills").eq("user_id", user.id).maybeSingle(),
      supabase.from("career_roadmaps").select("roadmap").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ])
    const failed = profileResult.error ?? roadmapResult.error
    if (failed) { setError(failed.message); return }
    if (profileResult.data) setProfile({ placementGoal: profileResult.data.placement_goal, targetDate: profileResult.data.target_date ?? "", internships: profileResult.data.internships.join(", "), companies: profileResult.data.companies.join(", "), skills: profileResult.data.skills.join(", ") })
    if (roadmapResult.data) setRoadmap(roadmapResult.data.roadmap as Roadmap)
  }, [user])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadCareerData() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadCareerData])

  function update(field: keyof CareerProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }))
    setNotice(null)
  }

  async function saveProfile() {
    if (!supabase || !user) { setError(supabaseConfigError ?? "Your session is unavailable."); return false }
    if (!profile.placementGoal.trim()) { setError("Add a placement or career goal first."); return false }
    const { error: saveError } = await supabase.from("career_profiles").upsert({ user_id: user.id, placement_goal: profile.placementGoal.trim(), target_date: profile.targetDate || null, internships: splitList(profile.internships), companies: splitList(profile.companies), skills: splitList(profile.skills), updated_at: new Date().toISOString() })
    if (saveError) { setError(saveError.message); return false }
    setError(null); setNotice("Career details saved.")
    return true
  }

  async function generateRoadmap() {
    if (!session) { setError("Your session is unavailable. Please refresh and try again."); return }
    setLoading(true); setError(null); setNotice(null)
    try {
      if (!await saveProfile()) return
      const result = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/career-roadmap`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ placementGoal: profile.placementGoal, targetDate: profile.targetDate, internships: splitList(profile.internships), companies: splitList(profile.companies), skills: splitList(profile.skills) }) })
      const body = await result.json()
      if (!result.ok) throw new Error(body.error ?? "Could not generate a career roadmap.")
      if (!supabase || !user) throw new Error("Your session is unavailable.")
      const [roadmapSave, activitySave] = await Promise.all([
        supabase.from("career_roadmaps").insert({ user_id: user.id, title: body.roadmap.title, roadmap: body.roadmap }),
        supabase.from("activity_events").insert({ user_id: user.id, event_type: "career_roadmap_generated", description: `Generated career roadmap: ${body.roadmap.title}` }),
      ])
      if (roadmapSave.error) throw new Error(roadmapSave.error.message)
      if (activitySave.error) throw new Error(activitySave.error.message)
      setRoadmap(body.roadmap as Roadmap); setNotice("Roadmap generated and saved to your workspace.")
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not generate a career roadmap.") }
    finally { setLoading(false) }
  }

  return <section className="mx-auto max-w-7xl space-y-6 pb-8">
    <div><Badge className="bg-primary/15 text-primary"><BriefcaseBusiness className="mr-1 size-3" />Career Agent</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Turn your placement goal into a focused roadmap.</h1><p className="mt-2 max-w-3xl text-muted-foreground">Share your ambitions, target roles, companies, and skills. The Career Agent turns them into milestones, portfolio projects, and a practical learning path.</p></div>
    <div className="grid gap-6 xl:grid-cols-[.95fr_1.05fr]">
      <Card><CardContent className="p-5 sm:p-6"><h2 className="flex items-center gap-2 font-semibold"><Target className="size-4 text-primary" />Career profile</h2><div className="mt-5 space-y-4">
        <Field label="Placement or career goal" value={profile.placementGoal} onChange={(value) => update("placementGoal", value)} placeholder="e.g. Secure a frontend internship by May" required />
        <label className="block text-sm font-medium">Target date<input type="date" value={profile.targetDate} onChange={(event) => update("targetDate", event.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-background/50 px-3 font-normal" /></label>
        <Field label="Internships or roles" value={profile.internships} onChange={(value) => update("internships", value)} placeholder="e.g. Frontend intern, software engineering intern" />
        <Field label="Target companies" value={profile.companies} onChange={(value) => update("companies", value)} placeholder="e.g. Atlassian, Razorpay, Microsoft" />
        <Field label="Current skills" value={profile.skills} onChange={(value) => update("skills", value)} placeholder="e.g. React, TypeScript, Python" />
        <p className="text-xs text-muted-foreground">Use commas to separate items.</p>
        <Button variant="secondary" onClick={() => void saveProfile()} disabled={loading}><Save className="size-4" />Save career details</Button>
      </div></CardContent></Card>
      <Card><CardContent className="p-5 sm:p-6"><h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-primary" />Build your roadmap</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">GPT-5.6 will prioritize your biggest gaps, align portfolio work to your targets, and make the next steps concrete.</p><div className="mt-6 rounded-2xl border border-border bg-muted/15 p-4"><p className="text-sm font-medium">Your roadmap includes</p><ul className="mt-3 space-y-2 text-sm text-muted-foreground"><li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-primary" />Time-bound milestones</li><li className="flex gap-2"><Code2 className="size-4 shrink-0 text-primary" />Portfolio project recommendations</li><li className="flex gap-2"><ExternalLink className="size-4 shrink-0 text-primary" />Focused learning resources and application tactics</li></ul></div>{error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}{notice && <p className="mt-5 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary">{notice}</p>}<Button size="lg" onClick={() => void generateRoadmap()} disabled={loading} className="mt-5 w-full">{loading ? <><Loader2 className="size-4 animate-spin" />Building roadmap...</> : <><Sparkles className="size-4" />Generate career roadmap</>}</Button></CardContent></Card>
    </div>
    {roadmap && <RoadmapView roadmap={roadmap} />}
  </section>
}

function Field({ label, value, onChange, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) { return <label className="block text-sm font-medium">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} className="mt-2 h-11 w-full rounded-xl border bg-background/50 px-3 font-normal" /></label> }

function RoadmapView({ roadmap }: { roadmap: Roadmap }) { return <Card><CardContent className="p-5 sm:p-7"><h2 className="text-xl font-semibold">{roadmap.title}</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">{roadmap.summary}</p><div className="mt-7 grid gap-6 lg:grid-cols-2"><div><h3 className="mb-3 font-semibold">Milestones</h3>{roadmap.milestones.map((item) => <div key={`${item.timeframe}-${item.objective}`} className="mb-3 rounded-2xl border border-border bg-muted/15 p-4"><p className="text-xs font-medium uppercase tracking-wide text-primary">{item.timeframe}</p><p className="mt-1 font-medium">{item.objective}</p><ul className="mt-3 space-y-1 text-sm text-muted-foreground">{item.actions.map((action) => <li key={action} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />{action}</li>)}</ul></div>)}</div><div><h3 className="mb-3 font-semibold">Recommended projects</h3>{roadmap.recommended_projects.map((project) => <div key={project.title} className="mb-3 rounded-2xl border border-border bg-muted/15 p-4"><p className="font-medium">{project.title}</p><p className="mt-1 text-sm text-muted-foreground">{project.why_it_matters}</p><p className="mt-3 text-sm"><span className="font-medium">Scope:</span> <span className="text-muted-foreground">{project.scope}</span></p><div className="mt-3 flex flex-wrap gap-1.5">{project.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div></div>)}</div></div><div className="mt-7 grid gap-6 lg:grid-cols-2"><div><h3 className="mb-3 font-semibold">Learning resources</h3>{roadmap.learning_resources.map((item) => <div key={`${item.topic}-${item.resource}`} className="mb-2 rounded-xl border border-border p-3 text-sm"><p className="font-medium">{item.topic} · {item.resource}</p><p className="mt-1 text-muted-foreground">{item.reason}</p></div>)}</div><div><h3 className="mb-3 font-semibold">Application strategy</h3>{roadmap.application_strategy.map((item) => <p key={item} className="mb-2 flex gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm"><Sparkles className="size-4 shrink-0 text-primary" />{item}</p>)}</div></div></CardContent></Card> }
