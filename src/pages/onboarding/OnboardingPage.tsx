import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { useAuth } from "@/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const careerGoalOptions = ["Software engineering", "Product management", "Data & AI", "Design", "Research", "Entrepreneurship"]
const internshipOptions = ["Startups", "Large technology companies", "Research labs", "Consulting", "Social impact", "Remote roles"]
const hackathonOptions = ["AI / machine learning", "Web development", "Mobile apps", "Developer tools", "Climate / social good", "I’m new to hackathons"]

type ProfileForm = {
  semester: string
  careerGoals: string[]
  skills: string
  preferredStudyHours: string
  internshipInterests: string[]
  hackathonInterests: string[]
  learningGoals: string
}

const initialForm: ProfileForm = {
  semester: "",
  careerGoals: [],
  skills: "",
  preferredStudyHours: "",
  internshipInterests: [],
  hackathonInterests: [],
  learningGoals: "",
}

function ChoiceList({ options, value, onChange }: { options: string[]; value: string[]; onChange: (value: string[]) => void }) {
  function toggle(option: string) {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option])
  }
  return <div className="grid gap-2 sm:grid-cols-2">{options.map((option) => <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-3 text-sm transition-colors hover:bg-muted/50"><input className="size-4 accent-primary" type="checkbox" checked={value.includes(option)} onChange={() => toggle(option)} /><span>{option}</span></label>)}</div>
}

export function OnboardingPage() {
  const { user, configurationError } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ProfileForm>(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!user) return <Navigate to="/auth" replace />

  const update = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => setForm((current) => ({ ...current, [key]: value }))
  const stepValid = [
    Boolean(form.semester && form.careerGoals.length),
    Boolean(form.skills.trim() && form.preferredStudyHours),
    Boolean(form.internshipInterests.length && form.hackathonInterests.length),
    Boolean(form.learningGoals.trim()),
  ][step]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step < 3) {
      if (!stepValid) {
        setError("Please complete the required fields before continuing.")
        return
      }
      setError(null)
      setStep((current) => current + 1)
      return
    }
    if (!stepValid || !supabase) {
      setError(configurationError ?? "Supabase is unavailable. Please try again.")
      return
    }
    setSaving(true)
    setError(null)
    const skills = form.skills.split(",").map((skill) => skill.trim()).filter(Boolean)
    const { error: saveError } = await supabase.from("student_profiles").upsert({
      user_id: user.id,
      semester: form.semester,
      career_goals: form.careerGoals,
      skills,
      preferred_study_hours: form.preferredStudyHours,
      internship_interests: form.internshipInterests,
      hackathon_interests: form.hackathonInterests,
      learning_goals: form.learningGoals.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    navigate("/app", { replace: true })
  }

  return (
    <main className="min-h-screen bg-background bg-grid px-4 py-8 sm:py-14">
      <section className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground"><span>StudentOS AI setup</span><span>Step {step + 1} of 4</span></div>
        <div className="mb-8 grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((index) => <div key={index} className={`h-1.5 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
        <Card>
          <CardHeader>
            <CardTitle>{["Your academic direction", "Your study rhythm", "Your opportunities", "What you want to learn"][step]}</CardTitle>
            <CardDescription>{["Tell us where you are and the career paths you want to explore.", "Help the Planner fit recommendations around your real schedule.", "Match recommendations to the experiences you want to pursue.", "Set a learning outcome for your personalized plan."][step]}</CardDescription>
          </CardHeader>
          <CardContent>
            {configurationError && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{configurationError}</p>}
            {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 0 && <><label className="block space-y-2 text-sm font-medium">Current semester<select value={form.semester} onChange={(event) => update("semester", event.target.value)} className="h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20" required><option value="">Select your semester</option>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={`Semester ${index + 1}`}>Semester {index + 1}</option>)}</select></label><fieldset className="space-y-2"><legend className="text-sm font-medium">Career goals</legend><ChoiceList options={careerGoalOptions} value={form.careerGoals} onChange={(value) => update("careerGoals", value)} /></fieldset></>}
              {step === 1 && <><label className="block space-y-2 text-sm font-medium">Skills you already have<Input value={form.skills} onChange={(event) => update("skills", event.target.value)} placeholder="e.g. Python, Figma, public speaking" required /><span className="block text-xs font-normal text-muted-foreground">Separate skills with commas.</span></label><label className="block space-y-2 text-sm font-medium">Preferred study hours<select value={form.preferredStudyHours} onChange={(event) => update("preferredStudyHours", event.target.value)} className="h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20" required><option value="">Choose a time</option><option>Early morning</option><option>Morning</option><option>Afternoon</option><option>Evening</option><option>Late night</option><option>Flexible</option></select></label></>}
              {step === 2 && <><fieldset className="space-y-2"><legend className="text-sm font-medium">Internship interests</legend><ChoiceList options={internshipOptions} value={form.internshipInterests} onChange={(value) => update("internshipInterests", value)} /></fieldset><fieldset className="space-y-2"><legend className="text-sm font-medium">Hackathon interests</legend><ChoiceList options={hackathonOptions} value={form.hackathonInterests} onChange={(value) => update("hackathonInterests", value)} /></fieldset></>}
              {step === 3 && <label className="block space-y-2 text-sm font-medium">Learning goals<textarea value={form.learningGoals} onChange={(event) => update("learningGoals", event.target.value)} placeholder="For example: Build and deploy a full-stack project by the end of this semester." className="min-h-36 w-full rounded-xl border border-border bg-muted/40 p-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20" required /></label>}
              <div className="flex items-center justify-between gap-3 pt-2">{step > 0 ? <Button type="button" variant="ghost" onClick={() => { setError(null); setStep((current) => current - 1) }}><ArrowLeft className="size-4" />Back</Button> : <span />}{step < 3 ? <Button type="submit">Continue<ArrowRight className="size-4" /></Button> : <Button type="submit" disabled={saving || Boolean(configurationError)}>{saving ? "Saving…" : <><Check className="size-4" />Finish setup</>}</Button>}</div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
