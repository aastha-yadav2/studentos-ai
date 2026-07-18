const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" }

Deno.serve((request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers })
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers })
  if (!request.headers.get("Authorization")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers })
  return new Response(JSON.stringify({ configured: Boolean(Deno.env.get("OPENAI_API_KEY")), model: "gpt-5.6" }), { headers })
})
