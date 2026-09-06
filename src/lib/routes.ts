import { Bot, BookOpen, BrainCircuit, BriefcaseBusiness, Compass, CheckSquare, Gauge, Goal, Settings, Sparkles, UserRound, TrendingUp } from "lucide-react"

export const appRoutes = [
  { title: "Dashboard", href: "/app", icon: Gauge, description: "Your AI command center" },
  { title: "Planner", href: "/app/planner", icon: Sparkles, description: "Coordinate your agents" },
  { title: "Opportunities", href: "/app/opportunities", icon: Compass, description: "Discover hackathons & internships" },
  { title: "Study", href: "/app/study", icon: BookOpen, description: "Plan exam preparation" },
  { title: "Career", href: "/app/career", icon: BriefcaseBusiness, description: "Build your placement roadmap" },
  { title: "Tasks", href: "/app/tasks", icon: CheckSquare, description: "Execute your priorities" },
  { title: "Goals", href: "/app/goals", icon: Goal, description: "Track outcomes" },
  { title: "AI Memory", href: "/app/memory", icon: BrainCircuit, description: "Manage AI personalization" },
  { title: "Reflection", href: "/app/reflection", icon: TrendingUp, description: "Learn from your progress" },
  { title: "Agents", href: "/app/agents", icon: Bot, description: "View specialist agents" },
  { title: "Settings", href: "/app/settings", icon: Settings, description: "Manage preferences" },
]

export const authRoutes = [
  { title: "Authentication", href: "/auth", icon: UserRound, description: "Sign in or create account" },
]
