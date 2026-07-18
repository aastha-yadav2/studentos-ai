# Feature guide

Every product surface follows the same pattern: collect user-owned data under RLS, build a scoped context, call a secure Edge Function where AI is needed, persist a useful result, and render an explainable UI.

## AI Planner

**Purpose:** turn an outcome into an orchestrated study, career, project, and productivity plan. **Flow:** enter a goal, timeframe, and weekly capacity; review streamed roadmap; retain the plan in history. **AI/backend:** `planner-stream` receives workspace and adaptive-learning context, streams structured JSON, then the client stores a planner run, recommendations, and activity. **UI:** `PlannerPage`, `plannerHistoryService`, `adaptivePlanner`.

## Study Assistant

**Purpose:** build exam preparation around subjects, dates, confidence, and availability. **Flow:** add subjects, choose hours, generate and save the study plan. **AI/backend:** `study-plan` uses the memory context and returns a structured schedule. **UI:** `StudyPage`, `subjects`, `study_plans`.

## Career Coach

**Purpose:** create a practical placement and internship roadmap. **Flow:** save target role, companies, internships, and skills; request roadmap. **AI/backend:** `career-roadmap` grounds output in career profile and memory. **UI:** `CareerPage`, `career_profiles`, `career_roadmaps`.

## Goals and tasks

**Purpose:** make outcomes measurable and daily execution visible. **Flow:** create goals, milestones, tasks, and deadlines; complete or reschedule them. **AI/backend:** goal advice is requested through `goal-recommendations`; all normal CRUD is RLS-protected Supabase data access. **UI:** `GoalsPage`, `TasksPage`, `use-goal-tracking`.

## AI Memory

**Purpose:** retain useful student context without copying every conversation into prompts. **Flow:** manage profile and memory entries; meaningful planner interactions and preferences are recorded. **AI/backend:** `buildAIContext` composes scoped profile, preferences, planner history, and relevant entries. **UI:** `MemoryPage`, `memoryService`, `profileService`, `preferenceLearningService`.

## Reflection and adaptive planning

**Purpose:** learn from execution and improve the next schedule. **Flow:** open Reflection to generate weekly review, monthly report, habits, coach message, predictions, and recommendations. **Backend logic:** `reflectionService`, `analyticsService`, `habitLearningService`, `coachingService`, `predictionService`, and `adaptivePlanner` calculate from persisted tasks/goals; the planner receives the result before new plan generation. **UI:** `ReflectionPage` and dashboard widgets.

## Productivity dashboard and analytics

**Purpose:** give an immediate view of workload, goals, deadlines, progress, consistency, and recommended next action. **Flow:** live queries hydrate the dashboard and subscriptions refresh workspace changes. **UI:** `DashboardPage`, `useDashboardData`, metric cards and timeline.

## Notifications

Notification preferences are stored in `user_preferences` for task reminders, deadline alerts, weekly summaries, and product updates. Delivery transport is intentionally not implemented yet; this avoids claiming email or push notifications that are not configured.
