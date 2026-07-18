# Devpost submission copy

## Project title

StudentOS AI

## One-line pitch

An adaptive AI operating system that learns from student progress and turns competing commitments into an explainable, realistic plan.

## Short description

StudentOS AI brings academic planning, career readiness, projects, goals, and reflection into one AI-powered workspace. It learns from completed work, identifies habits, predicts risk, and adapts future schedules.

## Full description

Students are expected to manage exams, applications, portfolios, hackathons, and habits with disconnected tools. StudentOS AI coordinates those commitments into a single command center. Its planner streams a cross-module roadmap; the memory layer retains meaningful context; and the reflection engine turns actual task execution into coaching, predictions, and adaptive recommendations.

The product is intentionally explainable. A student can see why a workload changed, why a task is next, or why deadline risk was raised. Each workspace is authenticated and protected by Supabase Row Level Security.

## Built with

React, TypeScript, Vite, Tailwind CSS, Radix UI, Framer Motion, Lucide, Supabase Auth, Supabase Postgres, Row Level Security, Supabase Edge Functions, Deno, and OpenAI API.

## Inspiration

We wanted to replace static student planners with a product that responds to the difference between the plan someone makes and the life they actually live.

## Challenges faced

Designing a coherent data model across study, career, project, memory, and reflection domains; keeping AI keys server-side; and creating an impressive demo without contaminating real user data.

## Accomplishments

We built a full adaptive loop: activity → reflection → habits/predictions/coaching → planning context, plus streaming planner interaction secured behind authenticated Edge Function requests.

## What we learned

Good AI product design requires clear evidence, useful fallback states, secure tenancy, and recommendations that explain their trade-offs.

## AI usage and innovation

OpenAI is called only from secure Edge Functions. Rather than treating the model as a generic chatbot, StudentOS builds scoped context from memory, goals, deadlines, and adaptive signals. The model generates structured plans while deterministic services calculate analytics and evidence.

## Future plans

Calendar integration, real notification delivery, vector memory, richer time-series analytics, resume/document storage, and collaborative campus workspaces.
