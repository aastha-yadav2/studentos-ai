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

export function testJsonReliability() {
  console.log("=== RUNNING JSON RELIABILITY SUITE ===")

  // 1. Valid JSON
  const test1 = '{"title": "Algorithms Exam Master Plan"}'
  const res1 = cleanAndExtractJson(test1)
  if (!res1.parsed) throw new Error("Test 1 Failed: Valid JSON not parsed")
  if (!validateSchema("planner", res1.parsed)) throw new Error("Test 1 Failed: Schema validation failed")
  console.log("✓ Test 1 Passed: Valid JSON")

  // 2. Fenced JSON (markdown fences)
  const test2 = '```json\n{"title": "Fenced Plan Title", "weeks": []}\n```'
  const res2 = cleanAndExtractJson(test2)
  if (!res2.parsed || res2.parsed.title !== "Fenced Plan Title") throw new Error("Test 2 Failed: Fenced JSON extraction failed")
  if (!validateSchema("planner", res2.parsed)) throw new Error("Test 2 Failed: Fenced JSON schema validation failed")
  console.log("✓ Test 2 Passed: Fenced JSON extraction")

  // 3. Fenced JSON with conversational preamble/postscript
  const test3 = 'Here is your requested plan:\n```json\n{"title": "Conversational Fenced Plan"}\n```\nHope this helps!'
  const res3 = cleanAndExtractJson(test3)
  if (!res3.parsed || res3.parsed.title !== "Conversational Fenced Plan") throw new Error("Test 3 Failed: Conversational fenced JSON failed")
  console.log("✓ Test 3 Passed: Conversational fenced JSON extraction")

  // 4. Malformed JSON
  const test4 = '{"title": "Unclosed JSON string...'
  const res4 = cleanAndExtractJson(test4)
  if (res4.parsed !== null) throw new Error("Test 4 Failed: Malformed JSON should return null parsed")
  if (validateSchema("planner", res4.parsed)) throw new Error("Test 4 Failed: Schema validation should fail on null parsed")
  console.log("✓ Test 4 Passed: Malformed JSON safely returns null")

  // 5. Schema validation failure (missing title)
  const test5 = '{"objective": "No title here"}'
  const res5 = cleanAndExtractJson(test5)
  if (validateSchema("planner", res5.parsed)) throw new Error("Test 5 Failed: Schema validation should fail when title is missing")
  console.log("✓ Test 5 Passed: Schema validation rejects missing title")

  // 6. Payload Compaction Simulation
  const largePayloadStr = JSON.stringify({
    goal: "DSA Exam Prep",
    workspaceContext: {
      memory: new Array(500).fill("long memory item text to simulate token bloat"),
      plannerHistory: new Array(200).fill({ plan: { title: "old heavy plan" } }),
    },
  })
  if (largePayloadStr.length <= 6000) throw new Error("Test 6 Setup Error: payload not large enough")

  const payloadObj = JSON.parse(largePayloadStr)
  let sanitized = payloadObj
  if (JSON.stringify(payloadObj).length > 6000) {
    const p = { ...payloadObj }
    if (p.workspaceContext) {
      const ctx = { ...p.workspaceContext }
      delete ctx.memory
      delete ctx.plannerHistory
      p.workspaceContext = ctx
    }
    sanitized = p
  }
  const sanitizedLen = JSON.stringify(sanitized).length
  if (sanitizedLen >= 6000) throw new Error(`Test 6 Failed: Compacted payload length ${sanitizedLen} still exceeds 6000`)
  console.log(`✓ Test 6 Passed: Payload compacted from ${largePayloadStr.length} to ${sanitizedLen} chars`)

  console.log("\n=== ALL 6 JSON RELIABILITY TESTS PASSED PROPERLY ===")
}

testJsonReliability()
