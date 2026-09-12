/* eslint-disable react-hooks/set-state-in-effect -- async data hydration in page mount effect */
import { useCallback, useEffect, useState } from "react"
import { Compass, Loader2, Radio, RefreshCw } from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "@/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { profileService } from "@/lib/memory/profileService"
import {
  fetchOpportunities,
  fetchUserApplications,
  fetchUserOpportunityMatches,
  fetchUserPrepPlans,
  fetchUserSavedOpportunities,
  fetchOpportunityChangeEvents,
} from "@/lib/opportunities/opportunityService"
import { calculateDeterministicMatch, isMatchStale } from "@/lib/opportunities/deterministicMatcher"
import { buildOpportunityRadar } from "@/lib/opportunities/radar/radarService"
import { RadarWidget } from "@/components/radar/RadarWidget"
import type { ComprehensiveMatchResult } from "@/lib/opportunities/opportunityAIService"
import type {
  ApplicationStatus,
  OpportunityPrepPlanData,
} from "@/lib/opportunities/opportunityTypes"
import type { RadarResult } from "@/lib/opportunities/radar/types"

export function RadarPage() {
  const { user } = useAuth()
  const [radarResult, setRadarResult] = useState<RadarResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchAndBuildRadar = useCallback(async () => {
    if (!user?.id) return
    setErrorMsg(null)
    try {
      const [opps, savedList, appsList, matchList, planList, changeEvents, profile] = await Promise.all([
        fetchOpportunities(),
        fetchUserSavedOpportunities(user.id),
        fetchUserApplications(user.id),
        fetchUserOpportunityMatches(user.id),
        fetchUserPrepPlans(user.id),
        fetchOpportunityChangeEvents(),
        profileService.get(user.id),
      ])

      const studentContext = {
        skills: profile?.skills ?? [],
        careerGoals: profile?.placement_goals ?? [],
        semester: profile?.semester ?? "Semester 6",
        internshipInterests: profile?.internship_goals ?? [],
        hackathonInterests: profile?.hackathon_interests ?? [],
      }

      const matchMap = new Map<string, ComprehensiveMatchResult>()
      matchList.forEach((m) => {
        const opp = opps.find((o) => o.id === m.opportunity_id)
        if (opp && !isMatchStale(m, studentContext, opp)) {
          const deterministic = calculateDeterministicMatch(studentContext, opp)
          matchMap.set(m.opportunity_id, {
            ...m,
            eligibility_status: deterministic.eligibility_status,
            eligibility_notes: deterministic.eligibility_notes,
            eligibility_location_score: deterministic.eligibility_location_score,
          })
        }
      })

      // Precompute deterministic fit score for remaining catalog items
      opps.forEach((opp) => {
        if (!matchMap.has(opp.id)) {
          const deterministic = calculateDeterministicMatch(studentContext, opp)
          matchMap.set(opp.id, {
            id: `deterministic-${opp.id}`,
            user_id: user.id,
            opportunity_id: opp.id,
            match_score: deterministic.match_score,
            skill_match_score: deterministic.skill_match_score,
            goal_match_score: deterministic.goal_match_score,
            eligibility_location_score: deterministic.eligibility_location_score,
            eligibility_status: deterministic.eligibility_status,
            eligibility_notes: deterministic.eligibility_notes,
            explanation: deterministic.explanation,
            strengths: deterministic.strengths,
            missing_skills: deterministic.missing_skills,
            gaps: deterministic.gaps,
            recommended_actions: deterministic.recommended_actions,
            computed_at: new Date().toISOString(),
          })
        }
      })

      const appMap = new Map<string, ApplicationStatus>()
      appsList.forEach((a) => appMap.set(a.opportunity_id, a.status))

      const savedSet = new Set<string>(savedList.map((s) => s.opportunity_id))

      const prepMap = new Map<string, OpportunityPrepPlanData>()
      planList.forEach((p) => {
        prepMap.set(p.opportunity_id, p.plan)
      })

      const result = buildOpportunityRadar({
        studentContext,
        opportunities: opps,
        savedOpportunityIds: savedSet,
        applications: appMap,
        matches: matchMap,
        prepPlans: prepMap,
        changeEvents,
      })

      setRadarResult(result)
    } catch (err) {
      console.error("Failed loading Radar data:", err)
      setErrorMsg("Failed to hydrate Opportunity Radar. Please try again.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [user])

  useEffect(() => {
    if (user?.id) {
      void fetchAndBuildRadar()
    }
  }, [user?.id, fetchAndBuildRadar])

  async function handleRefresh() {
    setIsRefreshing(true)
    await fetchAndBuildRadar()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Evaluating Opportunity Radar Priorities…</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="size-6 text-primary animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight">Opportunity Radar</h1>
            <Badge className="border-primary/40 bg-primary/10 text-primary">Phase 10 Intelligence</Badge>
            <Badge className="border-border bg-muted/30 text-muted-foreground text-[10px]">Deterministic 50/30/20 Score</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            What opportunity deserves your attention right now? Actionable priorities derived from match fit, urgency, recency & prep state.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="text-xs">
            <RefreshCw className={`size-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Radar
          </Button>
          <Button asChild size="sm" className="text-xs">
            <Link to="/app/opportunities">
              <Compass className="size-3.5 mr-1.5" /> Full Catalog
            </Link>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Main Radar Widget */}
      {radarResult && (
        <RadarWidget radar={radarResult} />
      )}
    </div>
  )
}
