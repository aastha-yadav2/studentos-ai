import { Navigate, createBrowserRouter } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"
import { AgentsPage } from "@/pages/agents/AgentsPage"
import { AuthPage } from "@/pages/auth/AuthPage"
import { DashboardPage } from "@/pages/dashboard/DashboardPage"
import { CareerPage } from "@/pages/career/CareerPage"
import { GoalsPage } from "@/pages/goals/GoalsPage"
import { OnboardingPage } from "@/pages/onboarding/OnboardingPage"
import { PlannerPage } from "@/pages/planner/PlannerPage"
import { SettingsPage } from "@/pages/settings/SettingsPage"
import { StudyPage } from "@/pages/study/StudyPage"
import { TasksPage } from "@/pages/tasks/TasksPage"
import { isAuthBypassEnabled } from "@/auth/auth-config"
import { AppErrorPage } from "@/app/error-page"

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/app" replace />, errorElement: <AppErrorPage /> },
  {
    path: "/auth",
    element: isAuthBypassEnabled ? <Navigate to="/app" replace /> : <AuthPage />,
    errorElement: <AppErrorPage />,
  },
  { path: "/onboarding", element: <OnboardingPage />, errorElement: <AppErrorPage /> },
  {
    path: "/app",
    element: <AppShell />,
    errorElement: <AppErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "planner", element: <PlannerPage /> },
      { path: "study", element: <StudyPage /> },
      { path: "career", element: <CareerPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "goals", element: <GoalsPage /> },
      { path: "agents", element: <AgentsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  { path: "*", element: <AppErrorPage /> },
])
