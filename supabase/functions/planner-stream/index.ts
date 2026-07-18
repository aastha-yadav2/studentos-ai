const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  if (!request.headers.get("Authorization")) return json({ error: "Unauthorized" }, 401)
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured." }, 500)
  try {
    const { goal, goalType, timeframe, weeklyHours, workspaceContext } = await request.json()
    if (typeof goal !== "string" || !goal.trim()) throw new Error("A goal is required.")
    const schema = {
      type: "object", additionalProperties: false,
      required: ["title", "goal_analysis", "weekly_roadmap", "daily_execution_plan", "priority_matrix", "estimated_effort", "risks_and_blockers", "success_metrics", "ai_reasoning", "recommendations"],
      properties: {
        title: { type: "string" },
        goal_analysis: { type: "object", additionalProperties: false, required: ["objective", "scope", "module_coordination"], properties: { objective: { type: "string" }, scope: { type: "string" }, module_coordination: { type: "array", items: { type: "object", additionalProperties: false, required: ["module", "role", "priority"], properties: { module: { type: "string", enum: ["Study", "Career", "Project", "Productivity"] }, role: { type: "string" }, priority: { type: "string", enum: ["High", "Medium", "Low"] } } } } } },
        weekly_roadmap: { type: "array", items: { type: "object", additionalProperties: false, required: ["week", "outcome", "deliverables", "estimated_hours"], properties: { week: { type: "string" }, outcome: { type: "string" }, deliverables: { type: "array", items: { type: "string" } }, estimated_hours: { type: "number" } } } },
        daily_execution_plan: { type: "array", items: { type: "object", additionalProperties: false, required: ["day", "focus", "tasks", "estimated_hours"], properties: { day: { type: "string" }, focus: { type: "string" }, tasks: { type: "array", items: { type: "string" } }, estimated_hours: { type: "number" } } } },
        priority_matrix: { type: "array", items: { type: "object", additionalProperties: false, required: ["item", "impact", "urgency", "quadrant", "next_action"], properties: { item: { type: "string" }, impact: { type: "string", enum: ["High", "Medium", "Low"] }, urgency: { type: "string", enum: ["High", "Medium", "Low"] }, quadrant: { type: "string" }, next_action: { type: "string" } } } },
        estimated_effort: { type: "object", additionalProperties: false, required: ["total_hours", "weekly_hours", "allocation"], properties: { total_hours: { type: "number" }, weekly_hours: { type: "number" }, allocation: { type: "array", items: { type: "object", additionalProperties: false, required: ["module", "hours", "rationale"], properties: { module: { type: "string" }, hours: { type: "number" }, rationale: { type: "string" } } } } } },
        risks_and_blockers: { type: "array", items: { type: "object", additionalProperties: false, required: ["risk", "mitigation"], properties: { risk: { type: "string" }, mitigation: { type: "string" } } } },
        success_metrics: { type: "array", items: { type: "object", additionalProperties: false, required: ["metric", "target", "cadence"], properties: { metric: { type: "string" }, target: { type: "string" }, cadence: { type: "string" } } } },
        ai_reasoning: { type: "object", additionalProperties: false, required: ["rationale", "tradeoffs", "assumptions"], properties: { rationale: { type: "string" }, tradeoffs: { type: "array", items: { type: "string" } }, assumptions: { type: "array", items: { type: "string" } } } },
        recommendations: { type: "array", items: { type: "string" } },
      },
    }
    const input = { goal: goal.trim(), goalType, timeframe, weeklyHours, workspaceContext: workspaceContext ?? {} }
    const upstream = await fetch("https://api.openai.com/v1/responses", { signal: AbortSignal.timeout(55_000), method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5.6", stream: true, instructions: "You are the StudentOS Planner Orchestrator. Coordinate Study, Career, Project, and Productivity modules around the user's goal. Use the supplied workspace context when relevant; do not invent existing commitments. Produce a realistic capacity-aware plan. The ai_reasoning field must be a concise, user-facing decision rationale and assumptions, never hidden chain-of-thought. Return only JSON matching the schema.", input: JSON.stringify(input), text: { format: { type: "json_schema", name: "orchestrated_execution_plan", strict: true, schema } } }) })
    if (!upstream.ok || !upstream.body) return json({ error: await upstream.text() }, upstream.status)
    return new Response(upstream.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } })
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Invalid request" }, 400) }
})

function json(body: unknown, status: number) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }) }
