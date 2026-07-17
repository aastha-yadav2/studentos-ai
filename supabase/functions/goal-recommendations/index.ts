const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" }

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers })
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  if (!apiKey) return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured." }), { status: 500, headers })
  try {
    const { goal, milestones } = await request.json()
    if (!goal?.title) throw new Error("A goal is required.")
    const schema = { type: "object", additionalProperties: false, required: ["recommendations"], properties: { recommendations: { type: "array", items: { type: "object", additionalProperties: false, required: ["priority", "content"], properties: { priority: { type: "string", enum: ["High", "Medium", "Low"] }, content: { type: "string" } } } } } }
    const upstream = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5.6", instructions: "You are the StudentOS Goal Agent. Give 3-5 practical, concise recommendations that help a student make measurable progress toward the goal before its target date. Respect current progress and existing milestones. Return only JSON matching the schema.", input: JSON.stringify({ goal, milestones }), text: { format: { type: "json_schema", name: "goal_recommendations", strict: true, schema } } }) })
    const response = await upstream.json()
    if (!upstream.ok) return new Response(JSON.stringify({ error: response.error?.message ?? "OpenAI request failed" }), { status: upstream.status, headers })
    return new Response(JSON.stringify(JSON.parse(response.output_text)), { headers })
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request" }), { status: 400, headers }) }
})
