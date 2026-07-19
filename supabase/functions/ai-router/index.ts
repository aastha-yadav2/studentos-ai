import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" }
const allowed = new Set(["resume_review", "personalized_study_plan", "career_advice", "reflection_analysis", "interview_preparation", "essay_improvement", "communication_draft"])
const fallback = (reason: string) => ({ source: "rules", fallback: true, message: `AI is unavailable (${reason}). Your workspace tools and rule-based plan remain available.` })
const hash = async (value: unknown) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value))))).map((v) => v.toString(16).padStart(2, "0")).join("")

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers })
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers })
  const authorization = request.headers.get("Authorization")
  if (!authorization) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers })
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } })
  const { data: auth } = await db.auth.getUser()
  if (!auth.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers })
  const { requestType, payload } = await request.json()
  if (!allowed.has(requestType)) return new Response(JSON.stringify(fallback("handled by rules")), { headers })
  const requestHash = await hash(payload)
  const { data: cached } = await db.from("ai_response_cache").select("response").eq("request_type", requestType).eq("request_hash", requestHash).gt("expires_at", new Date().toISOString()).maybeSingle()
  if (cached) return new Response(JSON.stringify({ ...cached.response, source: "cache" }), { headers })
  const { data: allowedToday } = await db.rpc("consume_ai_quota", { p_limit: 20 })
  if (!allowedToday) return new Response(JSON.stringify(fallback("daily limit reached")), { headers })
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  if (!apiKey) return new Response(JSON.stringify(fallback("AI is not configured")), { headers })
  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5.6", instructions: `You are StudentOS. Provide safe, practical ${requestType.replaceAll("_", " ")}. Return JSON with a single 'content' field.`, input: JSON.stringify(payload), text: { format: { type: "json_schema", name: "studentos_response", strict: true, schema: { type: "object", additionalProperties: false, required: ["content"], properties: { content: { type: "string" } } } } } }) })
    const body = await upstream.json(); if (!upstream.ok) return new Response(JSON.stringify(fallback("provider unavailable")), { headers })
    const response = JSON.parse(body.output_text); await db.from("ai_response_cache").upsert({ user_id: auth.user.id, request_type: requestType, request_hash: requestHash, response })
    return new Response(JSON.stringify({ ...response, source: "gpt" }), { headers })
  } catch { return new Response(JSON.stringify(fallback("provider unavailable")), { headers }) }
})
