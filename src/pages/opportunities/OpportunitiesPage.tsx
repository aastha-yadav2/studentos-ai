import { useEffect, useState } from "react"
import {
  Bookmark,
  BookmarkCheck,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Compass,
  ExternalLink,
  Filter,
  Layers,
  Loader2,
  Search,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react"
import { useAuth } from "@/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { profileService } from "@/lib/memory/profileService"
import {
  fetchOpportunities,
  fetchUserApplications,
  fetchUserOpportunityMatches,
  fetchUserPrepPlans,
  fetchUserSavedOpportunities,
  toggleSaveOpportunity,
  updateApplicationStatus,
} from "@/lib/opportunities/opportunityService"
import { computeOpportunityMatch, generateOpportunityPrepPlan } from "@/lib/opportunities/opportunityAIService"
import type {
  ApplicationStatus,
  Opportunity,
  OpportunityMatch,
  OpportunityPrepPlanData,
  OpportunityType,
} from "@/lib/opportunities/opportunityTypes"

type TabType = "catalog" | "saved" | "applications" | "prep"

export function OpportunitiesPage() {
  const { user, session } = useAuth()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [applications, setApplications] = useState<Map<string, ApplicationStatus>>(new Map())
  const [matches, setMatches] = useState<Map<string, OpportunityMatch>>(new Map())
  const [prepPlans, setPrepPlans] = useState<Map<string, OpportunityPrepPlanData>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  // Active Tab & Filters
  const [activeTab, setActiveTab] = useState<TabType>("catalog")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<OpportunityType | "all">("all")

  // Modals / Drawers
  const [selectedMatch, setSelectedMatch] = useState<{ opportunity: Opportunity; match: OpportunityMatch } | null>(null)
  const [selectedPrepPlan, setSelectedPrepPlan] = useState<{ opportunity: Opportunity; plan: OpportunityPrepPlanData } | null>(null)

  // AI loading indicators
  const [matchingId, setMatchingId] = useState<string | null>(null)
  const [prepId, setPrepId] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return
      setIsLoading(true)
      try {
        const [opps, savedList, appsList, matchList, planList] = await Promise.all([
          fetchOpportunities(),
          fetchUserSavedOpportunities(user.id),
          fetchUserApplications(user.id),
          fetchUserOpportunityMatches(user.id),
          fetchUserPrepPlans(user.id),
        ])

        setOpportunities(opps)
        setSavedIds(new Set(savedList.map((s) => s.opportunity_id)))

        const appMap = new Map<string, ApplicationStatus>()
        appsList.forEach((a) => appMap.set(a.opportunity_id, a.status))
        setApplications(appMap)

        const matchMap = new Map<string, OpportunityMatch>()
        matchList.forEach((m) => matchMap.set(m.opportunity_id, m))
        setMatches(matchMap)

        const planMap = new Map<string, OpportunityPrepPlanData>()
        planList.forEach((p) => planMap.set(p.opportunity_id, p.plan))
        setPrepPlans(planMap)
      } catch (err) {
        console.error("Failed loading opportunity data:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user?.id])

  async function handleToggleSave(oppId: string) {
    if (!user?.id) return
    const isCurrentlySaved = savedIds.has(oppId)
    const success = await toggleSaveOpportunity(user.id, oppId, isCurrentlySaved)
    if (success) {
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (isCurrentlySaved) next.delete(oppId)
        else next.add(oppId)
        return next
      })
    }
  }

  async function handleStatusChange(oppId: string, status: ApplicationStatus) {
    if (!user?.id) return
    const updated = await updateApplicationStatus(user.id, oppId, status)
    if (updated) {
      setApplications((prev) => new Map(prev).set(oppId, status))
    }
  }

  async function handleRunMatch(opportunity: Opportunity) {
    if (!user?.id) return
    setMatchingId(opportunity.id)
    try {
      const profile = await profileService.get(user.id)
      const computed = await computeOpportunityMatch(session, user.id, opportunity, {
        skills: profile?.skills ?? [],
        careerGoals: profile?.placement_goals ?? [],
        semester: profile?.semester ?? "Semester 6",
        internshipInterests: profile?.internship_goals ?? [],
        hackathonInterests: profile?.hackathon_interests ?? [],
      })
      if (computed) {
        setMatches((prev) => new Map(prev).set(opportunity.id, computed))
        setSelectedMatch({ opportunity, match: computed })
      }
    } finally {
      setMatchingId(null)
    }
  }

  async function handleRunPrepPlan(opportunity: Opportunity) {
    if (!user?.id) return
    setPrepId(opportunity.id)
    try {
      const profile = await profileService.get(user.id)
      const plan = await generateOpportunityPrepPlan(session, user.id, opportunity, {
        skills: profile?.skills ?? [],
        careerGoals: profile?.placement_goals ?? [],
        semester: profile?.semester ?? "Semester 6",
      })
      if (plan) {
        setPrepPlans((prev) => new Map(prev).set(opportunity.id, plan))
        setSelectedPrepPlan({ opportunity, plan })
      }
    } finally {
      setPrepId(null)
    }
  }

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.required_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = selectedType === "all" || opp.type === selectedType
    return matchesSearch && matchesType
  })

  const savedOpportunities = opportunities.filter((opp) => savedIds.has(opp.id))

  const applicationPipeline = opportunities
    .filter((opp) => applications.has(opp.id))
    .map((opp) => ({ opportunity: opp, status: applications.get(opp.id)! }))

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Hydrating Opportunity Intelligence Catalog…</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Opportunity Intelligence</h1>
            <Badge className="border-primary/40 bg-primary/10 text-primary">Live Verified Catalog</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated, real-world hackathons, fellowships, internships, and global competitions matched to your skills.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="bg-card/60 backdrop-blur-xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Trophy className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{opportunities.length}</p>
                <p className="text-xs text-muted-foreground">Verified Opportunities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <Bookmark className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{savedIds.size}</p>
                <p className="text-xs text-muted-foreground">Saved Bookmarks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                <Layers className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{applicationPipeline.length}</p>
                <p className="text-xs text-muted-foreground">Tracked Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{prepPlans.size}</p>
                <p className="text-xs text-muted-foreground">AI Prep Plans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3">
        {(
          [
            { id: "catalog", label: `Catalog (${opportunities.length})` },
            { id: "saved", label: `Saved (${savedIds.size})` },
            { id: "applications", label: `Applications (${applicationPipeline.length})` },
            { id: "prep", label: `AI Prep (${prepPlans.size})` },
          ] as const
        ).map((t) => (
          <Button
            key={t.id}
            variant={activeTab === t.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(t.id)}
            className="text-xs font-semibold"
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Catalog View */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, organization, or skill..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              <Filter className="size-4 text-muted-foreground shrink-0" />
              {(["all", "hackathon", "fellowship", "competition", "internship", "job", "grant"] as const).map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  className="capitalize text-xs shrink-0"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Catalog Cards Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredOpportunities.map((opp) => {
              const isSaved = savedIds.has(opp.id)
              const match = matches.get(opp.id)
              const hasPrep = prepPlans.has(opp.id)
              const appStatus = applications.get(opp.id)

              return (
                <Card key={opp.id} className="flex flex-col justify-between bg-card/60 backdrop-blur-xl border-border/80 hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge className="bg-muted/80 text-foreground capitalize text-[11px] font-semibold">{opp.type}</Badge>
                      <div className="flex items-center gap-1">
                        {match && (
                          <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold text-[11px]">
                            {match.match_score}% Fit
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => handleToggleSave(opp.id)}>
                          {isSaved ? <BookmarkCheck className="size-4 text-primary fill-primary" /> : <Bookmark className="size-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-base font-semibold line-clamp-1 mt-1">{opp.title}</CardTitle>
                    <CardDescription className="text-xs font-medium text-foreground/80">{opp.organization}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm flex-1">
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{opp.description}</p>
                    {opp.stipend_prize && (
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 p-2 rounded-lg">
                        <Trophy className="size-3.5 shrink-0" />
                        <span className="truncate">{opp.stipend_prize}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {opp.required_skills.map((skill) => (
                        <Badge key={skill} className="text-[10px] bg-muted/50 text-muted-foreground border-border">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <div className="p-5 pt-0 space-y-2 border-t border-border/40 mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3">
                      <span>{opp.location}</span>
                      <a href={opp.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
                        Official Page <ExternalLink className="size-3" />
                      </a>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button variant="secondary" size="sm" onClick={() => handleRunMatch(opp)} disabled={matchingId === opp.id} className="text-xs">
                        {matchingId === opp.id ? <Loader2 className="size-3 animate-spin mr-1" /> : <Zap className="size-3 text-amber-400 mr-1" />}
                        {match ? "View Fit" : "AI Match"}
                      </Button>
                      <Button variant="default" size="sm" onClick={() => handleRunPrepPlan(opp)} disabled={prepId === opp.id} className="text-xs">
                        {prepId === opp.id ? <Loader2 className="size-3 animate-spin mr-1" /> : <Sparkles className="size-3 text-primary-foreground mr-1" />}
                        {hasPrep ? "View Plan" : "Prep Plan"}
                      </Button>
                    </div>

                    <div className="pt-2">
                      <select
                        value={appStatus ?? "not_applied"}
                        onChange={(e) => {
                          const val = e.target.value as ApplicationStatus | "not_applied"
                          if (val !== "not_applied") handleStatusChange(opp.id, val)
                        }}
                        className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="not_applied">Tracker: Not Applied</option>
                        <option value="saved">Saved</option>
                        <option value="interested">Interested</option>
                        <option value="applying">Applying</option>
                        <option value="applied">Applied</option>
                        <option value="interviewing">Interviewing</option>
                        <option value="accepted">Accepted 🎉</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Saved View */}
      {activeTab === "saved" && (
        <div>
          {savedOpportunities.length === 0 ? (
            <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
              <Bookmark className="size-10 text-muted-foreground/60 mb-3" />
              <h3 className="font-semibold text-lg">No saved opportunities yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">Bookmark hackathons and internships in the catalog to quickly return to them later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {savedOpportunities.map((opp) => (
                <Card key={opp.id} className="bg-card/60 backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <Badge className="bg-muted text-foreground capitalize text-xs">{opp.type}</Badge>
                      <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => handleToggleSave(opp.id)}>
                        <BookmarkCheck className="size-4 text-primary fill-primary" />
                      </Button>
                    </div>
                    <CardTitle className="text-base font-semibold mt-2">{opp.title}</CardTitle>
                    <CardDescription className="text-xs">{opp.organization}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <a href={opp.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      Visit Official Platform <ExternalLink className="size-3" />
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Applications View */}
      {activeTab === "applications" && (
        <div>
          {applicationPipeline.length === 0 ? (
            <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
              <Briefcase className="size-10 text-muted-foreground/60 mb-3" />
              <h3 className="font-semibold text-lg">No active applications tracked</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">Select an application status on any opportunity card to manage your application pipeline.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applicationPipeline.map(({ opportunity, status }) => (
                <Card key={opportunity.id} className="bg-card/60 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-muted text-foreground capitalize text-xs">{opportunity.type}</Badge>
                      <h4 className="font-semibold text-sm">{opportunity.title}</h4>
                      <span className="text-xs text-muted-foreground">• {opportunity.organization}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{opportunity.description.slice(0, 120)}...</p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
                    <Badge className="bg-primary/20 text-primary capitalize font-semibold text-xs py-1 px-3">
                      {status.replace("_", " ")}
                    </Badge>
                    <a href={opportunity.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      Apply <ExternalLink className="size-3" />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Prep View */}
      {activeTab === "prep" && (
        <div>
          {prepPlans.size === 0 ? (
            <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
              <Sparkles className="size-10 text-primary/60 mb-3" />
              <h3 className="font-semibold text-lg">No AI Prep Plans generated yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">Click "Prep Plan" on any opportunity in the catalog to generate a tailored 4-week execution roadmap.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {Array.from(prepPlans.entries()).map(([oppId, plan]) => {
                const opp = opportunities.find((o) => o.id === oppId)
                if (!opp) return null
                return (
                  <Card key={oppId} className="bg-card/60 backdrop-blur-xl">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge className="border-primary/40 text-primary text-xs">AI Prep Plan</Badge>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedPrepPlan({ opportunity: opp, plan })}>
                          Full Details <ChevronRight className="size-4 ml-1" />
                        </Button>
                      </div>
                      <CardTitle className="text-base font-semibold mt-2">{opp.title}</CardTitle>
                      <CardDescription className="text-xs">{opp.organization}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground">{plan.summary}</p>
                      <div className="space-y-2 pt-2">
                        {plan.key_milestones.slice(0, 2).map((m) => (
                          <div key={m.week} className="flex items-start gap-2 text-xs bg-muted/40 p-2.5 rounded-lg">
                            <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">{m.week}: {m.title}</span>
                              <p className="text-muted-foreground text-[11px] mt-0.5">{m.focus}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* AI Match Modal / Drawer */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-amber-400" />
                <h3 className="font-bold text-lg">AI Match Insights</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMatch(null)}>Close</Button>
            </div>
            <div>
              <h4 className="font-semibold text-base">{selectedMatch.opportunity.title}</h4>
              <p className="text-xs text-muted-foreground">{selectedMatch.opportunity.organization}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center py-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-2xl font-extrabold text-emerald-400">{selectedMatch.match.match_score}%</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-1">Overall Fit</p>
              </div>
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3">
                <p className="text-2xl font-extrabold text-cyan-400">{selectedMatch.match.skill_match_score}%</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-1">Skill Match</p>
              </div>
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3">
                <p className="text-2xl font-extrabold text-purple-400">{selectedMatch.match.goal_match_score}%</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-1">Goal Fit</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold">Match Rationale:</p>
              <p className="text-muted-foreground bg-muted/40 p-3 rounded-xl leading-relaxed">{selectedMatch.match.explanation}</p>
            </div>

            {selectedMatch.match.strengths.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-emerald-400">Key Strengths:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMatch.match.strengths.map((s) => (
                    <Badge key={s} className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                      ✓ {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedMatch.match.missing_skills.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-amber-400">Skills to Build:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMatch.match.missing_skills.map((s) => (
                    <Badge key={s} className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                      + {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Prep Plan Modal / Drawer */}
      {selectedPrepPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h3 className="font-bold text-lg">Personalized AI Preparation Plan</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPrepPlan(null)}>Close</Button>
            </div>

            <div>
              <h4 className="font-bold text-lg">{selectedPrepPlan.opportunity.title}</h4>
              <p className="text-xs text-muted-foreground">{selectedPrepPlan.opportunity.organization} • {selectedPrepPlan.opportunity.type}</p>
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs space-y-1.5">
              <p className="font-semibold text-primary">Executive Summary</p>
              <p className="text-foreground/90 leading-relaxed">{selectedPrepPlan.plan.summary}</p>
            </div>

            <div className="space-y-3">
              <h5 className="font-semibold text-sm">4-Week Preparation Milestones</h5>
              <div className="space-y-3">
                {selectedPrepPlan.plan.key_milestones.map((m) => (
                  <div key={m.week} className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-primary">{m.week}: {m.title}</span>
                      <Badge className="bg-muted text-foreground text-[10px]">{m.focus}</Badge>
                    </div>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-1">
                      {m.action_items.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {selectedPrepPlan.plan.recommended_projects?.length > 0 && (
              <div className="space-y-2 text-xs">
                <p className="font-semibold">Recommended Portfolio Focus:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-1">
                  {selectedPrepPlan.plan.recommended_projects.map((proj, idx) => (
                    <li key={idx}>{proj}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
