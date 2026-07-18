const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" }

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers })
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers })
  if (!request.headers.get("Authorization")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers })
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  if (!apiKey) return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured." }), { status: 500, headers })
  try {
    const { subjects, weeklyHours, memoryContext } = await request.json()
    if (!Array.isArray(subjects) || !subjects.length) throw new Error("Add at least one subject before generating a schedule.")
    const schema = { type: "object", additionalProperties: false, required: ["title", "overview", "weekly_schedule", "revision_plan", "recommendations"], properties: { title: { type: "string" }, overview: { type: "string" }, weekly_schedule: { type: "array", items: { type: "object", additionalProperties: false, required: ["week", "focus", "sessions", "total_hours"], properties: { week: { type: "string" }, focus: { type: "string" }, total_hours: { type: "number" }, sessions: { type: "array", items: { type: "object", additionalProperties: false, required: ["day", "subject", "topic", "hours", "method"], properties: { day: { type: "string" }, subject: { type: "string" }, topic: { type: "string" }, hours: { type: "number" }, method: { type: "string" } } } } } } }, revision_plan: { type: "array", items: { type: "object", additionalProperties: false, required: ["subject", "strategy", "last_week_actions"], properties: { subject: { type: "string" }, strategy: { type: "string" }, last_week_actions: { type: "array", items: { type: "string" } } } } }, recommendations: { type: "array", items: { type: "string" } } } }
    const upstream = await fetch("https://api.openai.com/v1/responses", { signal: AbortSignal.timeout(55_000), method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5.6", instructions: "You are the StudentOS Study Agent. Create a realistic, personalized weekly study schedule and revision strategy. Weight weaker subjects and nearer exams more heavily. Use the provided memory context when relevant, but do not invent commitments. Do not schedule more than the available weekly hours. Return only JSON that matches the schema.", input: JSON.stringify({ weeklyHours, subjects, memoryContext: memoryContext ?? {} }), text: { format: { type: "json_schema", name: "study_schedule", strict: true, schema } } }) })
    const response = await upstream.json()
    if (!upstream.ok) return new Response(JSON.stringify({ error: response.error?.message ?? "OpenAI request failed" }), { status: upstream.status, headers })
    return new Response(JSON.stringify({ plan: JSON.parse(response.output_text) }), { headers })
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request" }), { status: 400, headers }) }
})
