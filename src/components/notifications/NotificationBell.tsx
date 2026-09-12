import { useCallback, useEffect, useRef, useState } from "react"
import { Bell, Check, CheckCheck, Clock, ExternalLink, Sparkles, X } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/auth/auth-provider"
import type { UserNotification } from "@/lib/notifications/types"
import {
  dismissNotification,
  fetchUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/notifications/notificationService"

function formatTime(iso: string) {
  try {
    const date = new Date(iso)
    const diffMs = Date.now() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  } catch {
    return "Recently"
  }
}

export function NotificationBell() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const list = await fetchUserNotifications(user.id)
    setNotifications(list)
    setLoading(false)
  }, [user])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const unreadCount = notifications.filter((n) => !n.read_at).length
  const displayed = filter === "unread" ? notifications.filter((n) => !n.read_at) : notifications

  async function handleMarkRead(id: string) {
    if (!user) return
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
    await markNotificationAsRead(user.id, id)
  }

  async function handleMarkAllRead() {
    if (!user || unreadCount === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })))
    await markAllNotificationsAsRead(user.id)
  }

  async function handleDismiss(id: string) {
    if (!user) return
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await dismissNotification(user.id, id)
  }

  function getSeverityBadge(severity: string) {
    switch (severity) {
      case "high":
        return <Badge className="border-red-400/30 bg-red-400/10 text-red-300">High</Badge>
      case "medium":
        return <Badge className="border-primary/30 bg-primary/10 text-primary">Info</Badge>
      default:
        return <Badge className="border-border/60 bg-muted/40 text-muted-foreground">Update</Badge>
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative size-9 rounded-full"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="font-semibold tracking-tight">Smart Notifications</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                <CheckCheck className="mr-1 size-3.5" />
                Mark all read
              </Button>
            )}
          </div>

          <div className="mt-3 flex gap-2 border-b border-border/40 pb-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filter === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filter === "unread" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading notifications...</div>
            ) : displayed.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-muted-foreground">You&apos;re all caught up.</p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  StudentOS will surface relevant opportunity updates here.
                </p>
              </div>
            ) : (
              displayed.map((n) => {
                const isUnread = !n.read_at
                return (
                  <div
                    key={n.id}
                    className={`group relative rounded-xl border p-3 transition ${
                      isUnread ? "border-primary/30 bg-primary/5" : "border-border/60 bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isUnread && <span className="size-2 rounded-full bg-primary" />}
                        {getSeverityBadge(n.severity)}
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="size-3" />
                          {formatTime(n.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        {isUnread && (
                          <button
                            onClick={() => void handleMarkRead(n.id)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Mark as read"
                          >
                            <Check className="size-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => void handleDismiss(n.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-400"
                          title="Dismiss notification"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-1.5 text-xs font-semibold text-foreground">{n.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{n.message}</p>

                    {n.action_url && (
                      <div className="mt-2.5 pt-1">
                        <Link
                          to={n.action_url}
                          onClick={() => {
                            if (isUnread) void handleMarkRead(n.id)
                            setIsOpen(false)
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          View opportunity
                          <ExternalLink className="size-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
