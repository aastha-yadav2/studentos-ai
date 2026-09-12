import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" }
const allowed = new Set(["planner", "personalized_study_plan", "career_advice", "goal_recommendations", "resume_review", "reflection_analysis", "reflection_coaching", "task_assistance", "interview_preparation", "essay_improvement", "communication_draft", "opportunity_match", "opportunity_prep_plan"])
const hash = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value))))).map((value) => value.toString(16).padStart(2, "0")).join("")
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers })
const error = (stage, message, status = 502, upstream) => json({ error: message, stage, upstream }, status)

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers })
  if (request.method !== "POST") return error("router", "Method not allowed", 405)

  const authorization = request.headers.get("Authorization")
  if (!authorization) return error("authentication", "Unauthorized", 401)
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } })
  const { data: auth, error: authError } = await db.auth.getUser()
  if (authError || !auth.user) return error("authentication", authError?.message ?? "Unauthorized", 401)

  let requestType
  let payload
  try { ({ requestType, payload } = await request.json()) } catch { return error("request", "Request body must be valid JSON.", 400) }
  if (!allowed.has(requestType)) return error("router", `Unsupported AI request type: ${requestType}`, 400)

  const requestHash = await hash(payload)
  console.info(JSON.stringify({ event: "ai_request", requestType, userId: auth.user.id, path: "browser>ai-router" }))
  const { data: cached, error: cacheError } = await db.from("ai_response_cache").select("response").eq("user_id", auth.user.id).eq("request_type", requestType).eq("request_hash", requestHash).gt("expires_at", new Date().toISOString()).maybeSingle()
  if (cacheError) console.warn(JSON.stringify({ event: "ai_cache_read_failed", requestType, message: cacheError.message }))
  if (cached) {
    console.info(JSON.stringify({ event: "ai_response", requestType, source: "cache" }))
    return json({ ...cached.response, source: "cache", fallback: false, trace: ["browser", "ai-router", "cache"] })
  }

  const { data: allowedToday, error: quotaError } = await db.rpc("consume_ai_quota", { p_limit: 20 })
  if (quotaError) return error("quota", quotaError.message, 500)
  if (!allowedToday) return error("quota", "Daily AI request limit reached. Try again tomorrow.", 429)

  const apiKey = Deno.env.get("GROQ_API_KEY")
  if (!apiKey) return error("configuration", "GROQ_API_KEY is not configured in Supabase Edge Function secrets.", 500)
  console.info(JSON.stringify({ event: "ai_secret_loaded", requestType, secret: "GROQ_API_KEY" }))

  try {
    const models = ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "mixtral-8x7b-32768"]
    let upstream: Response | undefined
    let upstreamBody: unknown
    let model = models[0]

    for (let i = 0; i < models.length; i++) {
      const candidate = models[i]
      model = candidate
      console.info(JSON.stringify({ event: "groq_request", requestType, model }))
      upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        signal: AbortSignal.timeout(55_000), method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "system", content: `You are the StudentOS ${requestType.replaceAll("_", " ")} agent. Provide safe, practical, personalized help. Follow any output shape requested in the user payload. Return only JSON with one string property named content; content must contain the requested JSON or text.` }, { role: "user", content: JSON.stringify(payload) }], response_format: { type: "json_object" } })
      })
      upstreamBody = await upstream.json().catch(() => null)
      if (upstream.ok || i === models.length - 1) break
      console.warn(JSON.stringify({ event: "groq_model_fallback", requestType, model, fallbackModel: models[i + 1], status: upstream.status }))
    }

    if (!upstream) return error("groq", "Groq request failed.", 502)
    if (!upstream.ok) {
      const message = (upstreamBody as { error?: { message?: string } } | null)?.error?.message ?? `Groq returned HTTP ${upstream.status}.`
      console.error(JSON.stringify({ event: "groq_error", requestType, status: upstream.status, message }))
      return error("groq", message, upstream.status, (upstreamBody as { error?: unknown } | null)?.error)
    }
    const response = JSON.parse((upstreamBody as { choices?: Array<{ message?: { content?: string } }> } | null)?.choices?.[0]?.message?.content ?? "{}")
    if (typeof response.content !== "string" || !response.content.trim()) return error("groq", "Groq returned no usable content.", 502, upstreamBody)
    const cacheResponse = { content: response.content }
    const { error: cacheWriteError } = await db.from("ai_response_cache").upsert({ user_id: auth.user.id, request_type: requestType, request_hash: requestHash, response: cacheResponse })
    if (cacheWriteError) console.warn(JSON.stringify({ event: "ai_cache_write_failed", requestType, message: cacheWriteError.message }))
    console.info(JSON.stringify({ event: "ai_response", requestType, source: "groq", path: "browser>ai-router>groq>response" }))
    return json({ ...cacheResponse, source: "groq", fallback: false, trace: ["browser", "ai-router", "groq", "response"] })
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Groq request failed."
    console.error(JSON.stringify({ event: "groq_error", requestType, message }))
    return error("groq", message)
  }
})
