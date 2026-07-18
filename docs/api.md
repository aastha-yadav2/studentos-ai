# API reference

All current API endpoints are Supabase Edge Functions under:

`https://<project-ref>.supabase.co/functions/v1/<route>`

Use `Authorization: Bearer <Supabase access token>` and `Content-Type: application/json` for POST requests. Functions return JSON except `planner-stream`, which returns server-sent events.

## `POST /planner-stream`

Creates a streamed, cross-module plan. Input: `{ goal, goalType, timeframe, weeklyHours, workspaceContext }`. The context contains profile, active goals/tasks, study/career facts, memory, and adaptive-learning signals. Output: SSE `response.output_text.delta` events whose final text is structured plan JSON. Authentication is required.

```json
{"goal":"Prepare for frontend interviews","goalType":"Internship","timeframe":"6 weeks","weeklyHours":10,"workspaceContext":{}}
```

## `POST /study-plan`

Creates a study schedule. Input: `{ subjects: [{ name, examDate, confidence }], weeklyHours, memoryContext }`. Output: `{ "plan": { "title": "…", "weekly_roadmap": [] } }`. Authentication is required.

## `POST /career-roadmap`

Creates a career roadmap. Input: `{ placementGoal, targetDate, internships, companies, skills, memoryContext }`. Output: `{ "roadmap": { ... } }`. Authentication is required.

## `POST /goal-recommendations`

Returns contextual milestone and execution suggestions. Input: `{ goal, milestones, memoryContext }`. Output: `{ "recommendations": ["…"] }`. Authentication is required.

## `GET /ai-configuration`

Checks whether the server-side OpenAI secret is configured. Output: `{ "configured": true, "model": "gpt-5.6" }`. Authentication header is sent by the client; this endpoint never returns the key.

### Errors

Functions return `{ "error": "human-readable message" }` with an appropriate non-2xx status when the request is invalid, the AI secret is missing, or generation fails. The UI exposes a retryable error message; clients should not retry a malformed request automatically.
