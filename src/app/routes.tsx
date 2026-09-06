/* eslint-disable react-refresh/only-export-components -- route modules are intentionally lazy-loaded here. */
import { lazy, Suspense } from "react"
import { Navigate, createBrowserRouter } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"
import { AppErrorPage } from "@/app/error-page"
import { ProtectedRoute, PublicOnlyRoute } from "@/auth/route-guards"

const AgentsPage = lazy(() => import("@/pages/agents/AgentsPage").then(({ AgentsPage }) => ({ default: AgentsPage })))
const AuthPage = lazy(() => import("@/pages/auth/AuthPage").then(({ AuthPage }) => ({ default: AuthPage })))
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage").then(({ DashboardPage }) => ({ default: DashboardPage })))
const CareerPage = lazy(() => import("@/pages/career/CareerPage").then(({ CareerPage }) => ({ default: CareerPage })))
const GoalsPage = lazy(() => import("@/pages/goals/GoalsPage").then(({ GoalsPage }) => ({ default: GoalsPage })))
const OnboardingPage = lazy(() => import("@/pages/onboarding/OnboardingPage").then(({ OnboardingPage }) => ({ default: OnboardingPage })))
const PlannerPage = lazy(() => import("@/pages/planner/PlannerPage").then(({ PlannerPage }) => ({ default: PlannerPage })))
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage").then(({ SettingsPage }) => ({ default: SettingsPage })))
const StudyPage = lazy(() => import("@/pages/study/StudyPage").then(({ StudyPage }) => ({ default: StudyPage })))
const TasksPage = lazy(() => import("@/pages/tasks/TasksPage").then(({ TasksPage }) => ({ default: TasksPage })))
const MemoryPage = lazy(() => import("@/pages/memory/MemoryPage").then(({ MemoryPage }) => ({ default: MemoryPage })))
const ReflectionPage = lazy(() => import("@/pages/reflection/ReflectionPage").then(({ ReflectionPage }) => ({ default: ReflectionPage })))
const OpportunitiesPage = lazy(() => import("@/pages/opportunities/OpportunitiesPage").then(({ OpportunitiesPage }) => ({ default: OpportunitiesPage })))
const page = (Page: React.LazyExoticComponent<React.ComponentType>) => <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Loading StudentOS…</div>}><Page /></Suspense>

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/app" replace />, errorElement: <AppErrorPage /> },
  {
    path: "/auth",
    element: <PublicOnlyRoute />,
    children: [{ index: true, element: page(AuthPage) }],
    errorElement: <AppErrorPage />,
  },
  { path: "/onboarding", element: <ProtectedRoute />, errorElement: <AppErrorPage />, children: [{ index: true, element: page(OnboardingPage) }] },
  {
    path: "/app",
    element: <ProtectedRoute />,
    errorElement: <AppErrorPage />,
    children: [
      { element: <AppShell />, children: [
        { index: true, element: page(DashboardPage) }, { path: "planner", element: page(PlannerPage) },
        { path: "opportunities", element: page(OpportunitiesPage) },
        { path: "study", element: page(StudyPage) }, { path: "career", element: page(CareerPage) },
        { path: "tasks", element: page(TasksPage) }, { path: "goals", element: page(GoalsPage) },
        { path: "memory", element: page(MemoryPage) }, { path: "reflection", element: page(ReflectionPage) },
        { path: "agents", element: page(AgentsPage) }, { path: "settings", element: page(SettingsPage) },
      ] },
    ],
  },
  { path: "*", element: <AppErrorPage /> },
])
