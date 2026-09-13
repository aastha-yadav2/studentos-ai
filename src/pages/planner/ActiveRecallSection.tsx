import { useState, useEffect } from "react"
import { Check, HelpCircle, Eye, EyeOff, Zap, BrainCircuit, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export type Priority = "High" | "Medium" | "Low"

export type ActiveRecallItem = {
  id: string
  topic: string
  question: string
  priority: Priority
  answer_hint?: string
  completed?: boolean
}

interface ActiveRecallSectionProps {
  items: ActiveRecallItem[]
  planTitle?: string
}

export function ActiveRecallSection({ items, planTitle = "default" }: ActiveRecallSectionProps) {
  const storageKey = `studentos_active_recall_${planTitle.replace(/\s+/g, "_")}`

  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore storage error
    }
    const initial: Record<string, boolean> = {}
    items.forEach((item) => {
      if (item.completed) initial[item.id] = true
    })
    return initial
  })

  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all")

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(completedMap))
    } catch {
      // ignore
    }
  }, [completedMap, storageKey])

  const toggleCompleted = (id: string) => {
    setCompletedMap((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleHint = (id: string) => {
    setRevealedHints((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const resetAll = () => {
    setCompletedMap({})
    setRevealedHints({})
  }

  const completedCount = items.filter((item) => completedMap[item.id]).length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const filteredItems = items.filter((item) => {
    const isDone = Boolean(completedMap[item.id])
    if (filter === "pending") return !isDone
    if (filter === "completed") return isDone
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header & Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Zap className="size-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Active Recall Practice Checklist</h3>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Test your knowledge without looking at your notes. Derived from your personalized study plan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">
              {completedCount} / {totalCount} Mastered
            </p>
            <p className="text-xs text-muted-foreground">{progressPercent}% complete</p>
          </div>
          {completedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetAll} className="h-8 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="mr-1 size-3" /> Reset Progress
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-emerald-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant={filter === "all" ? "default" : "secondary"}
          size="sm"
          onClick={() => setFilter("all")}
          className="h-8 text-xs"
        >
          All Prompts ({totalCount})
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "secondary"}
          size="sm"
          onClick={() => setFilter("pending")}
          className="h-8 text-xs"
        >
          Pending ({totalCount - completedCount})
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "secondary"}
          size="sm"
          onClick={() => setFilter("completed")}
          className="h-8 text-xs"
        >
          Mastered ({completedCount})
        </Button>
      </div>

      {/* Checklist Grid */}
      {filteredItems.length === 0 ? (
        <Card className="border-dashed border-border p-8 text-center">
          <BrainCircuit className="mx-auto size-8 text-muted-foreground/60" />
          <p className="mt-2 font-medium text-muted-foreground">
            {filter === "completed" ? "No active recall items mastered yet. Start testing yourself!" : "All prompts completed!"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredItems.map((item) => {
            const isCompleted = Boolean(completedMap[item.id])
            const isHintRevealed = Boolean(revealedHints[item.id])

            return (
              <Card
                key={item.id}
                className={`transition-all ${
                  isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/5 opacity-80"
                    : "border-border/80 bg-card hover:border-primary/40"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/15 text-primary text-xs">{item.topic}</Badge>
                      <PriorityBadge value={item.priority} />
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCompleted(item.id)}
                      className={`flex size-6 shrink-0 items-center justify-center rounded-lg border transition ${
                        isCompleted
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border bg-background hover:border-emerald-500"
                      }`}
                      aria-label={isCompleted ? "Mark as uncompleted" : "Mark as completed"}
                    >
                      {isCompleted && <Check className="size-3.5" />}
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    <p className={`text-sm font-medium leading-6 ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.question}
                    </p>

                    {item.answer_hint && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => toggleHint(item.id)}
                          className="flex items-center gap-1 text-xs text-primary transition hover:underline"
                        >
                          {isHintRevealed ? (
                            <>
                              <EyeOff className="size-3" /> Hide Answer Hint
                            </>
                          ) : (
                            <>
                              <Eye className="size-3" /> Reveal Answer Hint
                            </>
                          )}
                        </button>

                        {isHintRevealed && (
                          <div className="mt-2 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs text-foreground/90 animate-in fade-in duration-200">
                            <p className="flex items-center gap-1 font-semibold text-primary mb-1">
                              <HelpCircle className="size-3" /> Recall Key / Hint:
                            </p>
                            <p className="leading-5">{item.answer_hint}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PriorityBadge({ value }: { value: Priority }) {
  return (
    <Badge
      className={
        value === "High"
          ? "border-rose-400/30 bg-rose-400/15 text-rose-300 text-xs"
          : value === "Medium"
          ? "border-amber-400/30 bg-amber-400/15 text-amber-300 text-xs"
          : "bg-muted text-muted-foreground text-xs"
      }
    >
      {value}
    </Badge>
  )
}
