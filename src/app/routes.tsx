import { Navigate, createBrowserRouter } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"
import { AgentsPage } from "@/pages/agents/AgentsPage"
import { AuthPage } from "@/pages/auth/AuthPage"
import { DashboardPage } from "@/pages/dashboard/DashboardPage"
import { GoalsPage } from "@/pages/goals/GoalsPage"
import { OnboardingPage } from "@/pages/onboarding/OnboardingPage"
import { PlannerPage } from "@/pages/planner/PlannerPage"
import { SettingsPage } from "@/pages/settings/SettingsPage"
import { TasksPage } from "@/pages/tasks/TasksPage"

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/auth" replace /> },
  { path: "/auth", element: <AuthPage /> },
  { path: "/onboarding", element: <OnboardingPage /> },
  {
    path: "/app",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "planner", element: <PlannerPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "goals", element: <GoalsPage /> },
      { path: "agents", element: <AgentsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
])
