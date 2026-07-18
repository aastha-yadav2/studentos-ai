const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" }

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers })
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers })
  if (!request.headers.get("Authorization")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers })
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  if (!apiKey) return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured." }), { status: 500, headers })

  try {
    const { placementGoal, targetDate, internships, companies, skills, memoryContext } = await request.json()
    if (typeof placementGoal !== "string" || !placementGoal.trim()) throw new Error("Add a placement goal before generating a roadmap.")
    const schema = {
      type: "object", additionalProperties: false,
      required: ["title", "summary", "milestones", "recommended_projects", "learning_resources", "application_strategy"],
      properties: {
        title: { type: "string" }, summary: { type: "string" },
        milestones: { type: "array", items: { type: "object", additionalProperties: false, required: ["timeframe", "objective", "actions"], properties: { timeframe: { type: "string" }, objective: { type: "string" }, actions: { type: "array", items: { type: "string" } } } } },
        recommended_projects: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "why_it_matters", "skills", "scope"], properties: { title: { type: "string" }, why_it_matters: { type: "string" }, skills: { type: "array", items: { type: "string" } }, scope: { type: "string" } } } },
        learning_resources: { type: "array", items: { type: "object", additionalProperties: false, required: ["topic", "resource", "reason"], properties: { topic: { type: "string" }, resource: { type: "string" }, reason: { type: "string" } } } },
        application_strategy: { type: "array", items: { type: "string" } },
      },
    }
    const profile = { placementGoal: placementGoal.trim(), targetDate: targetDate || null, internships: Array.isArray(internships) ? internships : [], companies: Array.isArray(companies) ? companies : [], skills: Array.isArray(skills) ? skills : [], memoryContext: memoryContext ?? {} }
    const upstream = await fetch("https://api.openai.com/v1/responses", { signal: AbortSignal.timeout(55_000), method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5.6", instructions: "You are the StudentOS Career Agent. Create a specific, realistic placement and internship roadmap. Base recommendations on the student's stated goal, target companies, skills, timeline, and relevant memory context. Do not invent commitments. Include measurable milestones, portfolio projects with sensible scopes, trustworthy resource names (do not invent URLs), and a practical application strategy. Return only JSON matching the schema.", input: JSON.stringify(profile), text: { format: { type: "json_schema", name: "career_roadmap", strict: true, schema } } }) })
    const response = await upstream.json()
    if (!upstream.ok) return new Response(JSON.stringify({ error: response.error?.message ?? "OpenAI request failed" }), { status: upstream.status, headers })
    return new Response(JSON.stringify({ roadmap: JSON.parse(response.output_text) }), { headers })
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request" }), { status: 400, headers }) }
})
