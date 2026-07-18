# Setup and deployment

## Local setup

1. Install Node.js 20+ and the Supabase CLI.
2. Clone the repo and run `npm install`.
3. Copy `.env.example` to `.env.local` and add public Supabase values.
4. Create/link a Supabase project: `supabase link --project-ref <ref>`.
5. Run `supabase db push` to apply tables, indexes, and RLS policies.
6. Add the AI secret: `supabase secrets set OPENAI_API_KEY=<key>`.
7. Deploy or serve functions locally: `supabase functions serve`.
8. Start the UI: `npm run dev`.
9. Validate: `npm run build` and `npm run lint`.

Authentication is required in every environment. Create a test user in Supabase Auth for local development; do not add an authentication bypass.

## Deployment

**Frontend:** import the repository in Vercel, set the two `VITE_SUPABASE_*` variables, build with `npm run build`, and publish `dist`. Configure the deployment URL in Supabase Auth redirect URLs.

**Backend:** run `supabase db push`, set the OpenAI secret, then deploy each function with `supabase functions deploy <name>`. Confirm `/ai-configuration` reports `configured: true` while authenticated.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| “Supabase is not configured” | `.env.local`, Vite restart, and the `VITE_` prefix |
| AI generation fails | deployed function, access token, and `OPENAI_API_KEY` Supabase secret |
| Empty workspace | sign in with the intended account and create initial workspace data |
| RLS error | table policy, authenticated session, and matching `user_id` |
| Build failure | Node version, clean install, then `npm run build` |
