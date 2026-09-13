export type Priority = "High" | "Medium" | "Low"

export type ActiveRecallItem = {
  id: string
  topic: string
  question: string
  priority: Priority
  answer_hint?: string
  completed?: boolean
}

export type RoadmapNodeStatus = "completed" | "in_progress" | "next" | "ready" | "locked"

export type RoadmapNode = {
  id: string
  title: string
  description: string
  priority: Priority
  status: RoadmapNodeStatus
  prerequisites: string[]
  estimated_hours: number
  mastery_criteria: string[]
  recommended_practice?: string[]
}

export type GraphicalRoadmap = {
  title: string
  nodes: RoadmapNode[]
}

export type PracticeProgressionItem = {
  level: "Easy" | "Medium" | "Hard" | "Exam Level"
  goal: string
}

export type TopicMasteryGuide = {
  topic: string
  category: "DSA Pattern" | "Theory & Concepts" | "Core Skill" | "Revision"
  priority: Priority
  what_is_it: string
  why_it_works: string
  how_to_recognize: string
  remember_this: string[]
  common_traps: string[]
  complexity_notes?: string
  practice_progression: PracticeProgressionItem[]
  move_on_checklist: string[]
}

export type DailyTaskItem = {
  action: string
  type: "Teach/Learn" | "Practice" | "Recall" | "Revise" | "Test"
  estimated_minutes: number
  move_on_trigger?: string
}

export type DailyExecutionDay = {
  day: string
  focus: string
  tasks: DailyTaskItem[]
  estimated_hours: number
}

/** Validate and sanitize roadmap nodes: remove self-refs, missing prereqs, duplicate IDs, circular refs */
export function validateAndSanitizeRoadmap(rawNodes: RoadmapNode[]): RoadmapNode[] {
  if (!Array.isArray(rawNodes) || rawNodes.length === 0) return []

  const seenIds = new Set<string>()
  const sanitized: RoadmapNode[] = []

  for (const node of rawNodes) {
    if (!node || typeof node !== "object") continue
    const rawId = String(node.id || node.title || `node_${sanitized.length}`)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
    let id = rawId
    let counter = 1
    while (seenIds.has(id)) {
      id = `${rawId}_${counter++}`
    }
    seenIds.add(id)

    sanitized.push({
      id,
      title: String(node.title || "Topic Node"),
      description: String(node.description || "Master core concepts and practice problems."),
      priority: (node.priority as Priority) || "Medium",
      status: (node.status as RoadmapNodeStatus) || "ready",
      prerequisites: Array.isArray(node.prerequisites) ? node.prerequisites.map((p) => String(p)) : [],
      estimated_hours: Number(node.estimated_hours) || 3,
      mastery_criteria: Array.isArray(node.mastery_criteria) ? node.mastery_criteria.map((m) => String(m)) : [],
      recommended_practice: Array.isArray(node.recommended_practice)
        ? node.recommended_practice.map((rp) => String(rp))
        : undefined,
    })
  }

  for (const node of sanitized) {
    node.prerequisites = node.prerequisites.filter((pId) => pId !== node.id && seenIds.has(pId))
  }

  const visited = new Map<string, number>()
  const hasCycle = (nodeId: string, graph: Map<string, string[]>): boolean => {
    visited.set(nodeId, 1)
    const neighbors = graph.get(nodeId) || []
    for (const neighbor of neighbors) {
      const state = visited.get(neighbor) || 0
      if (state === 1) return true
      if (state === 0 && hasCycle(neighbor, graph)) return true
    }
    visited.set(nodeId, 2)
    return false
  }

  const adjMap = new Map<string, string[]>()
  sanitized.forEach((n) => adjMap.set(n.id, n.prerequisites))

  for (const node of sanitized) {
    visited.clear()
    if (hasCycle(node.id, adjMap)) {
      node.prerequisites = []
      adjMap.set(node.id, [])
    }
  }

  return sanitized
}

export function normalizeActiveRecall(
  rawRecall: unknown,
  topicMastery?: TopicMasteryGuide[],
  rememberNotes?: { topic: string; key_takeaway: string; active_recall_prompt: string }[]
): ActiveRecallItem[] {
  const items: ActiveRecallItem[] = []
  const seenQuestions = new Set<string>()

  if (Array.isArray(rawRecall) && rawRecall.length > 0) {
    rawRecall.forEach((item: unknown, idx: number) => {
      if (typeof item === "string" && item.trim()) {
        const q = item.trim()
        if (!seenQuestions.has(q)) {
          seenQuestions.add(q)
          items.push({ id: `recall_${idx}`, topic: "Core Concept", question: q, priority: "High" })
        }
      } else if (typeof item === "object" && item !== null) {
        const rec = item as Record<string, unknown>
        const q = String(rec.question || rec.prompt || rec.action || "").trim()
        if (q && !seenQuestions.has(q)) {
          seenQuestions.add(q)
          items.push({
            id: String(rec.id || `recall_${idx}`),
            topic: String(rec.topic || "Core Topic"),
            question: q,
            priority: (rec.priority as Priority) || "High",
            answer_hint: rec.answer_hint ? String(rec.answer_hint) : undefined,
            completed: Boolean(rec.completed),
          })
        }
      }
    })
  }

  if (items.length === 0) {
    if (topicMastery && topicMastery.length > 0) {
      topicMastery.forEach((guide, gIdx) => {
        const q1 = `Close your notes: What is ${guide.topic} and why does it work?`
        if (!seenQuestions.has(q1)) {
          seenQuestions.add(q1)
          items.push({
            id: `recall_tm_${gIdx}_1`,
            topic: guide.topic,
            question: q1,
            priority: guide.priority || "High",
            answer_hint: guide.what_is_it ? `${guide.what_is_it} — ${guide.why_it_works}` : undefined,
          })
        }

        if (guide.how_to_recognize) {
          const q2 = `How do you recognize ${guide.topic} in problem statements?`
          if (!seenQuestions.has(q2)) {
            seenQuestions.add(q2)
            items.push({
              id: `recall_tm_${gIdx}_2`,
              topic: guide.topic,
              question: q2,
              priority: guide.priority || "Medium",
              answer_hint: guide.how_to_recognize,
            })
          }
        }

        if (guide.common_traps && guide.common_traps.length > 0) {
          const q3 = `What common beginner mistakes should you avoid when applying ${guide.topic}?`
          if (!seenQuestions.has(q3)) {
            seenQuestions.add(q3)
            items.push({
              id: `recall_tm_${gIdx}_3`,
              topic: guide.topic,
              question: q3,
              priority: "High",
              answer_hint: guide.common_traps.join("; "),
            })
          }
        }
      })
    }

    if (rememberNotes && rememberNotes.length > 0) {
      rememberNotes.forEach((note, nIdx) => {
        const q = String(note.active_recall_prompt || `Explain key takeaway for ${note.topic}`).trim()
        if (q && !seenQuestions.has(q)) {
          seenQuestions.add(q)
          items.push({
            id: `recall_rn_${nIdx}`,
            topic: note.topic || "Memory Note",
            question: q,
            priority: "High",
            answer_hint: note.key_takeaway,
          })
        }
      })
    }
  }

  return items
}

export function normalizeRoadmap(
  rawRoadmap: unknown,
  planTitle: string,
  topicMastery?: TopicMasteryGuide[],
  weeklyRoadmap?: { week: string; outcome: string; deliverables: string[]; estimated_hours: number }[]
): GraphicalRoadmap {
  let nodes: RoadmapNode[] = []

  if (typeof rawRoadmap === "object" && rawRoadmap !== null) {
    const rm = rawRoadmap as Record<string, unknown>
    if (Array.isArray(rm.nodes) && rm.nodes.length > 0) {
      nodes = rm.nodes.map((n: unknown, idx: number) => {
        const rec = typeof n === "object" && n !== null ? (n as Record<string, unknown>) : {}
        return {
          id: String(rec.id || `node_${idx}`),
          title: String(rec.title || `Stage ${idx + 1}`),
          description: String(rec.description || "Master core concepts and practice."),
          priority: (rec.priority as Priority) || "Medium",
          status: (rec.status as RoadmapNodeStatus) || (idx === 0 ? "next" : "locked"),
          prerequisites: Array.isArray(rec.prerequisites) ? rec.prerequisites.map((p) => String(p)) : [],
          estimated_hours: Number(rec.estimated_hours) || 3,
          mastery_criteria: Array.isArray(rec.mastery_criteria) ? rec.mastery_criteria.map((m) => String(m)) : [],
          recommended_practice: Array.isArray(rec.recommended_practice)
            ? rec.recommended_practice.map((rp) => String(rp))
            : undefined,
        }
      })
    }
  }

  if (nodes.length === 0) {
    if (topicMastery && topicMastery.length > 0) {
      nodes = topicMastery.map((guide, idx) => {
        const id = guide.topic.toLowerCase().replace(/[^a-z0-9_]/g, "_") || `topic_${idx}`
        const prevId = idx > 0 ? (topicMastery[idx - 1].topic.toLowerCase().replace(/[^a-z0-9_]/g, "_") || `topic_${idx - 1}`) : null

        return {
          id,
          title: guide.topic,
          description: guide.what_is_it || `Master ${guide.topic} pattern & practice progression.`,
          priority: guide.priority || "Medium",
          status: idx === 0 ? "next" : idx === 1 ? "ready" : "locked",
          prerequisites: prevId ? [prevId] : [],
          estimated_hours: 3,
          mastery_criteria: guide.move_on_checklist?.length
            ? guide.move_on_checklist
            : ["Explain core concept without notes", "Solve 2 practice problems"],
          recommended_practice: guide.practice_progression?.map((p) => `${p.level}: ${p.goal}`),
        }
      })
    } else if (weeklyRoadmap && weeklyRoadmap.length > 0) {
      nodes = weeklyRoadmap.map((w, idx) => {
        const id = `week_${idx + 1}`
        const prevId = idx > 0 ? `week_${idx}` : null

        return {
          id,
          title: `${w.week}: ${w.outcome}`,
          description: w.deliverables?.join("; ") || "Complete weekly preparation milestones.",
          priority: "High",
          status: idx === 0 ? "next" : "locked",
          prerequisites: prevId ? [prevId] : [],
          estimated_hours: Number(w.estimated_hours) || 4,
          mastery_criteria: w.deliverables || ["Complete weekly milestone"],
        }
      })
    }
  }

  const sanitizedNodes = validateAndSanitizeRoadmap(nodes)
  const title =
    typeof rawRoadmap === "object" && rawRoadmap !== null && typeof (rawRoadmap as Record<string, unknown>).title === "string"
      ? String((rawRoadmap as Record<string, unknown>).title)
      : `${planTitle} Learning Roadmap`

  return { title, nodes: sanitizedNodes }
}
