import { useState } from "react"
import { ArrowRight, Calendar, Compass, ExternalLink, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RadarItem, RadarResult } from "@/lib/opportunities/radar/types"

interface RadarWidgetProps {
  radar: RadarResult
  compact?: boolean
}

export function RadarWidget({ radar, compact = false }: RadarWidgetProps) {
  const [activeTab, setActiveTab] = useState<"all" | "applyNow" | "bestMatches" | "deadlineSoon" | "prepareNext">("all")
  const primary = radar.primaryRecommendation

  if (!primary) {
    return (
      <Card className="border-border/80 bg-card/75">
        <CardContent className="p-6 text-center">
          <Compass className="mx-auto size-8 text-muted-foreground" />
          <h3 className="mt-2 text-base font-semibold">Your Radar is clear</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            StudentOS will surface relevant opportunity updates and prioritized recommendations here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── 1. PRIMARY TOP RECOMMENDATION HERO CARD ────────────────────── */}
      <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-background p-6 shadow-xl">
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="size-3.5" />
          Next Best Opportunity
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">{primary.opportunity.organization}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground capitalize">{primary.opportunity.type}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{primary.opportunity.title}</h2>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{primary.opportunity.description}</p>
          </div>

          <div className="flex flex-shrink-0 flex-col items-start sm:items-end">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-primary">{primary.priority.matchScore}%</span>
              <span className="text-xs font-medium text-muted-foreground">Match</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="size-3.5" />
              {primary.opportunity.deadline ? new Date(primary.opportunity.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Rolling / Unspecified"}
            </div>
          </div>
        </div>

        {/* Reason chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/50 pt-4">
          {primary.reasonChips.map((chip, idx) => (
            <Badge
              key={idx}
              className={
                chip.variant === "primary"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : chip.variant === "warning"
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                  : chip.variant === "success"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : "border-border/60 bg-muted/40 text-muted-foreground"
              }
            >
              {chip.label}
            </Badge>
          ))}
          <Button asChild size="sm" className="ml-auto">
            <Link to={primary.primaryAction.href}>
              {primary.primaryAction.label}
              <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
      </Card>

      {!compact && (
        <>
          {/* ── 2. RADAR CATEGORY TABS ───────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex flex-wrap gap-2">
              <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")} label="All Signals" count={radar.applyNow.length + radar.bestMatches.length} />
              <TabButton active={activeTab === "applyNow"} onClick={() => setActiveTab("applyNow")} label="🔥 Apply Now" count={radar.applyNow.length} />
              <TabButton active={activeTab === "bestMatches"} onClick={() => setActiveTab("bestMatches")} label="🎯 Best Matches" count={radar.bestMatches.length} />
              <TabButton active={activeTab === "deadlineSoon"} onClick={() => setActiveTab("deadlineSoon")} label="⏰ Deadline Soon" count={radar.deadlineSoon.length} />
              <TabButton active={activeTab === "prepareNext"} onClick={() => setActiveTab("prepareNext")} label="🧠 Prepare Next" count={radar.prepareNext.length} />
            </div>

            <Button asChild variant="ghost" size="sm" className="text-xs text-primary hover:underline">
              <Link to="/app/opportunities">
                Browse catalog <ExternalLink className="ml-1 size-3" />
              </Link>
            </Button>
          </div>

          {/* ── 3. RADAR SECTION CARDS ───────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {getFilteredItems(radar, activeTab).map((item) => (
              <RadarCard key={item.opportunity.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        active ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/30 text-muted-foreground hover:bg-muted"
      }`}
    >
      {label} {count > 0 && <span className="ml-1 opacity-80">({count})</span>}
    </button>
  )
}

function getFilteredItems(radar: RadarResult, tab: string): RadarItem[] {
  switch (tab) {
    case "applyNow":
      return radar.applyNow
    case "bestMatches":
      return radar.bestMatches
    case "deadlineSoon":
      return radar.deadlineSoon
    case "prepareNext":
      return radar.prepareNext
    default:
      return Array.from(new Set([...radar.applyNow, ...radar.bestMatches, ...radar.deadlineSoon])).slice(0, 9)
  }
}

function RadarCard({ item }: { item: RadarItem }) {
  return (
    <Card className="flex flex-col justify-between border-border/70 bg-card/60 p-4 transition hover:border-primary/40 hover:bg-card">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-primary">{item.opportunity.organization}</span>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {item.priority.matchScore}%
          </span>
        </div>

        <h3 className="mt-2 line-clamp-1 text-sm font-bold text-foreground">{item.opportunity.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.opportunity.description}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.reasonChips.slice(0, 2).map((chip, idx) => (
            <span key={idx} className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
        <span className="text-[11px] text-muted-foreground capitalize">{item.opportunity.type}</span>
        <Button asChild size="sm" variant="secondary" className="h-7 text-xs">
          <Link to={item.primaryAction.href}>{item.primaryAction.label}</Link>
        </Button>
      </div>
    </Card>
  )
}
