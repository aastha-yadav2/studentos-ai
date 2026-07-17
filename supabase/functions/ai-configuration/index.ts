const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" }

Deno.serve((request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers })
  return new Response(JSON.stringify({ configured: Boolean(Deno.env.get("OPENAI_API_KEY")), model: "gpt-5.6" }), { headers })
})
