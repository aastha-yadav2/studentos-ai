import { useState, useMemo } from "react"
import {
  ArrowDown,
  CheckCircle2,
  Lock,
  Play,
  Clock,
  Target,
  Sparkles,
  ChevronRight,
  ListCheck,
  X,
  BookOpen,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  validateAndSanitizeRoadmap,
  type GraphicalRoadmap,
  type RoadmapNode,
  type RoadmapNodeStatus,
} from "./plannerNormalizer"

interface GraphicalRoadmapViewProps {
  roadmap: GraphicalRoadmap
  onConvertTopicToTask?: (node: RoadmapNode) => void
}

export function GraphicalRoadmapView({ roadmap, onConvertTopicToTask }: GraphicalRoadmapViewProps) {
  const nodes = useMemo(() => validateAndSanitizeRoadmap(roadmap.nodes), [roadmap.nodes])
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null)

  const completedCount = nodes.filter((n) => n.status === "completed").length
  const inProgressCount = nodes.filter((n) => n.status === "in_progress" || n.status === "next").length
  const progressPercent = nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary text-xs">AI Learning Path</Badge>
            <span className="text-xs text-muted-foreground">{nodes.length} Connected Stages</span>
          </div>
          <h3 className="mt-1 text-xl font-semibold text-foreground">{roadmap.title || "Personalized Study Roadmap"}</h3>
        </div>

        {/* Legend & Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">
              {completedCount} / {nodes.length} Stages Completed
            </p>
            <p className="text-xs text-muted-foreground">{inProgressCount} Active / In-Progress</p>
          </div>
          <div className="h-9 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Roadmap Status Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card/60 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider text-foreground">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-sky-500 animate-pulse" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" />
          <span>Next Actionable</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-indigo-400" />
          <span>Ready</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          <span>Locked (Prereqs Required)</span>
        </div>
      </div>

      {/* Connected Graph View */}
      {nodes.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">No roadmap nodes available.</Card>
      ) : (
        <div className="relative space-y-4 py-2">
          {/* Main Nodes Container */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {nodes.map((node, index) => {
              const status = node.status
              const isSelected = selectedNode?.id === node.id
              const prereqNodes = node.prerequisites
                .map((pId) => nodes.find((n) => n.id === pId))
                .filter(Boolean) as RoadmapNode[]

              return (
                <div key={node.id} className="relative group">
                  <Card
                    onClick={() => setSelectedNode(node)}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "ring-2 ring-primary border-primary shadow-lg shadow-primary/10"
                        : "hover:border-primary/50 hover:shadow-md"
                    } ${getStatusCardStyle(status)}`}
                  >
                    <CardContent className="p-5 space-y-3">
                      {/* Top Bar: Index, Status Badge & Priority */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-full bg-background/80 text-xs font-bold text-muted-foreground border">
                            {index + 1}
                          </span>
                          <StatusBadge status={status} />
                        </div>
                        {node.priority === "High" && (
                          <Badge className="border-rose-500/40 bg-rose-500/15 text-rose-300 text-[10px] uppercase font-semibold">
                            High Priority
                          </Badge>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                          {node.title}
                          <ChevronRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-5">
                          {node.description}
                        </p>
                      </div>

                      {/* Prerequisites indicator if any */}
                      {prereqNodes.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                          <span className="font-medium text-foreground">Requires:</span>
                          <span className="truncate">
                            {prereqNodes.map((p) => p.title).join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Footer: Hours & Criteria count */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 text-primary" />
                          {node.estimated_hours}h est.
                        </span>
                        <span className="flex items-center gap-1 text-primary">
                          <ListCheck className="size-3" />
                          {node.mastery_criteria.length} Mastery Criteria
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Flow Connector Arrow for Desktop Flow */}
                  {index < nodes.length - 1 && (
                    <div className="hidden lg:block absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none opacity-30 group-hover:opacity-100 transition-opacity">
                      <ArrowDown className="size-4 text-primary" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Interactive Node Details Modal / Drawer */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl space-y-5">
            {/* Close Button */}
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={selectedNode.status} />
                <Badge className="bg-primary/15 text-primary text-xs">{selectedNode.priority} Priority</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                  <Clock className="size-3" /> {selectedNode.estimated_hours} hours
                </span>
              </div>
              <h3 className="text-2xl font-bold text-foreground">{selectedNode.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedNode.description}</p>
            </div>

            {/* Prerequisites */}
            {selectedNode.prerequisites.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Prerequisites Required:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.prerequisites.map((pId) => {
                    const reqNode = nodes.find((n) => n.id === pId)
                    return (
                      <Badge key={pId} className="border-primary/30 bg-background text-xs py-1">
                        {reqNode?.title || pId}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Mastery Criteria */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Target className="size-4" />
                Mastery Criteria (Checklist to move on)
              </p>
              <ul className="space-y-2">
                {selectedNode.mastery_criteria.map((criterion, cIdx) => (
                  <li key={cIdx} className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-background/60 p-3 text-sm text-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                    <span>{criterion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Practice */}
            {selectedNode.recommended_practice && selectedNode.recommended_practice.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="size-3.5 text-primary" />
                  Recommended Practice Problems:
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground pl-4 list-disc">
                  {selectedNode.recommended_practice.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => setSelectedNode(null)}>
                Close
              </Button>

              {onConvertTopicToTask && (
                <Button
                  size="sm"
                  onClick={() => {
                    onConvertTopicToTask(selectedNode)
                    setSelectedNode(null)
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Sparkles className="mr-1.5 size-4" />
                  Start Topic & Create StudentOS Task
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getStatusCardStyle(status: RoadmapNodeStatus) {
  switch (status) {
    case "completed":
      return "border-emerald-500/40 bg-emerald-500/5 text-foreground"
    case "in_progress":
      return "border-sky-500/50 bg-sky-500/5 text-foreground shadow-sm shadow-sky-500/10"
    case "next":
      return "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
    case "ready":
      return "border-indigo-500/30 bg-indigo-500/5 text-foreground"
    case "locked":
    default:
      return "border-border/60 bg-muted/15 text-muted-foreground opacity-90"
  }
}

function StatusBadge({ status }: { status: RoadmapNodeStatus }) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
          <CheckCircle2 className="mr-1 size-3" /> Completed
        </Badge>
      )
    case "in_progress":
      return (
        <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-xs">
          <Play className="mr-1 size-3" /> In Progress
        </Badge>
      )
    case "next":
      return (
        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-semibold">
          <Sparkles className="mr-1 size-3" /> Next Action
        </Badge>
      )
    case "ready":
      return (
        <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
          Ready
        </Badge>
      )
    case "locked":
    default:
      return (
        <Badge className="bg-muted text-muted-foreground border-border text-xs font-normal">
          <Lock className="mr-1 size-3" /> Locked
        </Badge>
      )
  }
}
