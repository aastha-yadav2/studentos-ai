import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface DashboardCardProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function DashboardCard({ children, className, delay = 0 }: DashboardCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("rounded-3xl border border-border/70 bg-card/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl", className)}
    >
      {children}
    </motion.section>
  )
}
