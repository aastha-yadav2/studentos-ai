import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
}
const allowed = new Set([
  "planner",
  "personalized_study_plan",
  "career_advice",
  "goal_recommendations",
  "resume_review",
  "reflection_analysis",
  "reflection_coaching",
  "task_assistance",
  "interview_preparation",
  "essay_improvement",
  "communication_draft",
  "opportunity_match",
  "opportunity_prep_plan",
])

const hash = async (value: unknown) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)))))
    .map((val) => val.toString(16).padStart(2, "0"))
    .join("")

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
const error = (stage: string, message: string, status = 502, upstream?: unknown) =>
  json({ error: message, stage, upstream }, status)

export function cleanAndExtractJson(rawText: string): { parsed: Record<string, unknown> | null; cleanedText: string } {
  if (!rawText || typeof rawText !== "string") return { parsed: null, cleanedText: "" }

  let cleaned = rawText.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  const firstBrace = cleaned.indexOf("{")
  const lastBrace = cleaned.lastIndexOf("}")
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }

  try {
    const parsed = JSON.parse(cleaned)
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return { parsed, cleanedText: cleaned }
    }
  } catch {
    // Return null parsed
  }
  return { parsed: null, cleanedText: cleaned }
}

export function validateSchema(requestType: string, parsed: Record<string, unknown> | null): boolean {
  if (!parsed) return false
  if (requestType === "planner" || requestType === "personalized_study_plan") {
    return typeof parsed.title === "string" && parsed.title.trim().length > 0
  }
  return Object.keys(parsed).length > 0
}

function getSystemPrompt(requestType: string): string {
  if (requestType === "planner" || requestType === "personalized_study_plan") {
    return `You are the StudentOS Master Academic & Technical Mentor AI — a world-class computer science educator and academic mentor.

CORE MENTORSHIP PRINCIPLES:
1. HOW TO LEARN, NOT JUST WHAT TO STUDY: Never generate generic timetables like "Day 1: Arrays, Day 2: Strings". Explain HOW to study using TEACH -> PRACTICE -> RECALL -> REVISE -> TEST.
2. MASTER-BEFORE-MOVING-ON: Provide clear "Move On When..." criteria for every topic.
3. PATTERN-BASED TEACHING (DSA / TECHNICAL TOPICS): Teach via pattern recognition (Traversal, Two Pointers, Sliding Window, Prefix Sum, Monotonic Stack, Binary Search, Trees, Heap, Graph, DP). For each pattern, explain: What is it, Why it works, How to recognize it in problem statements, Key rules/mental models, Common traps, Complexity, Practice progression, and Move-on checklist.
4. PRIORITY & TIME-COMPRESSED FALLBACK: Distinguish High, Medium, Low priorities. Always include a realistic "If Short On Time / Falling Behind" compressed strategy.
5. EXAM VS INTERVIEW MODE: Differentiate academic exam prep (definitions, theory, algorithm steps, trace tables) vs placement prep (problem solving, implementation, edge cases).
6. HIGH-YIELD MEMORY NOTES & ACTIVE RECALL: Include "Remember This" flashcard notes and active recall self-test prompts ("Close your notes and explain...").

CRITICAL FORMATTING INSTRUCTIONS:
- You MUST respond ONLY with a raw, valid JSON object matching the required schema.
- Do NOT wrap JSON in markdown fences (no \`\`\` or \`\`\`json).
- Do NOT add any preamble, conversational text, explanations, or notes before or after the JSON.
- Ensure all keys and string values use double quotes, arrays are arrays, and there are no trailing commas.
- Never output undefined, NaN, comments, or JavaScript objects.`
  }
  return `You are the StudentOS ${requestType.replaceAll("_", " ")} agent. Provide safe, practical, personalized help. Follow any output shape requested in the user payload. Return ONLY a valid JSON object. Do NOT use markdown fences or conversational text.`
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers })
  if (request.method !== "POST") return error("router", "Method not allowed", 405)

  const authorization = request.headers.get("Authorization")
  if (!authorization) return error("authentication", "Unauthorized", 401)
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: auth, error: authError } = await db.auth.getUser()
  if (authError || !auth.user) return error("authentication", authError?.message ?? "Unauthorized", 401)

  let requestType: string
  let payload: unknown
  try {
    ;({ requestType, payload } = await request.json())
  } catch {
    return error("request", "Request body must be valid JSON.", 400)
  }
  if (!allowed.has(requestType)) return error("router", `Unsupported AI request type: ${requestType}`, 400)

  const requestHash = await hash(payload)
  console.info(JSON.stringify({ event: "ai_request", requestType, userId: auth.user.id, path: "browser>ai-router" }))
  const { data: cached, error: cacheError } = await db
    .from("ai_response_cache")
    .select("response")
    .eq("user_id", auth.user.id)
    .eq("request_type", requestType)
    .eq("request_hash", requestHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

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

  // Payload Token Safety Guard: ensure total input payload stays well below Groq 7000 ITPM limit (<6000 chars)
  let sanitizedPayload = payload
  const payloadStr = JSON.stringify(payload)
  if (payloadStr.length > 6000) {
    console.warn(JSON.stringify({ event: "payload_safety_compressed", requestType, originalLength: payloadStr.length }))
    if (typeof payload === "object" && payload !== null) {
      const p = { ...(payload as Record<string, unknown>) }
      if (p.workspaceContext && typeof p.workspaceContext === "object") {
        const ctx = { ...(p.workspaceContext as Record<string, unknown>) }
        delete ctx.memory
        delete ctx.plannerHistory
        delete ctx.recentInteractions
        delete ctx.productivity_tasks
        delete ctx.recent_memories
        p.workspaceContext = ctx
      }
      sanitizedPayload = p
    }
  }

  const models = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b", "qwen/qwen3.8-27b"]

  for (let i = 0; i < models.length; i++) {
    const candidate = models[i]
    console.info(JSON.stringify({ event: "groq_request", requestType, model: candidate }))

    try {
      const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        signal: AbortSignal.timeout(55_000),
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: candidate,
          messages: [
            { role: "system", content: getSystemPrompt(requestType) },
            { role: "user", content: JSON.stringify(sanitizedPayload) },
          ],
          response_format: { type: "json_object" },
        }),
      })

      const upstreamBody = await upstream.json().catch(() => null)

      if (!upstream.ok) {
        const errMsg = upstreamBody?.error?.message ?? `Groq returned HTTP ${upstream.status}`
        console.warn(JSON.stringify({ event: "groq_model_failed", model: candidate, status: upstream.status, message: errMsg }))
        // If Groq API returned error (e.g. failed_generation or model issue), try next model in cascade
        continue
      }

      const rawContent = upstreamBody?.choices?.[0]?.message?.content ?? ""
      const { parsed, cleanedText } = cleanAndExtractJson(rawContent)

      // Schema validation check
      if (validateSchema(requestType, parsed)) {
        const cacheResponse = { content: cleanedText }
        await db.from("ai_response_cache").upsert({
          user_id: auth.user.id,
          request_type: requestType,
          request_hash: requestHash,
          response: cacheResponse,
        })
        console.info(JSON.stringify({ event: "ai_response", requestType, source: "groq", model: candidate }))
        return json({ ...cacheResponse, source: "groq", fallback: i > 0, trace: ["browser", "ai-router", candidate] })
      }

      // Compact repair attempt if initial response JSON was malformed or missing required schema
      console.warn(JSON.stringify({ event: "json_repair_attempt", model: candidate, rawSnippet: rawContent.slice(0, 200) }))
      const repairRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        signal: AbortSignal.timeout(30_000),
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: candidate,
          messages: [
            { role: "system", content: getSystemPrompt(requestType) },
            { role: "user", content: "Return ONLY valid JSON matching the required schema. No markdown, no explanation." },
          ],
          response_format: { type: "json_object" },
        }),
      })

      const repairBody = await repairRes.json().catch(() => null)
      if (repairRes.ok) {
        const repairRaw = repairBody?.choices?.[0]?.message?.content ?? ""
        const repaired = cleanAndExtractJson(repairRaw)
        if (validateSchema(requestType, repaired.parsed)) {
          const cacheResponse = { content: repaired.cleanedText }
          await db.from("ai_response_cache").upsert({
            user_id: auth.user.id,
            request_type: requestType,
            request_hash: requestHash,
            response: cacheResponse,
          })
          console.info(JSON.stringify({ event: "ai_response_repaired", requestType, source: "groq", model: candidate }))
          return json({ ...cacheResponse, source: "groq", fallback: i > 0, trace: ["browser", "ai-router", candidate, "repaired"] })
        }
      }
    } catch (err: any) {
      console.warn(JSON.stringify({ event: "groq_exception", model: candidate, error: err.message }))
    }
  }

  return error("groq", "All Groq model attempts failed to produce valid JSON.", 502)
})
