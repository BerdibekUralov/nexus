"use client"

import { useState, useEffect } from "react"
import { Bell, Clock, AlertTriangle, Sun, CheckCheck } from "lucide-react"

type NotificationType = "TASK_DUE_TODAY" | "TASK_OVERDUE" | "TASK_DUE_SOON" | "DAILY_SUMMARY"

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

const typeConfig: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  TASK_DUE_TODAY: { icon: <Clock size={18} />, color: "text-blue-400" },
  TASK_OVERDUE: { icon: <AlertTriangle size={18} />, color: "text-red-400" },
  TASK_DUE_SOON: { icon: <Bell size={18} />, color: "text-yellow-400" },
  DAILY_SUMMARY: { icon: <Sun size={18} />, color: "text-orange-400" },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    setLoading(true)
    const res = await fetch("/api/notifications")
    if (res.ok) setNotifications(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchNotifications() }, [])

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "PATCH" })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 text-sm mt-1">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors"
          >
            <CheckCheck size={16} />
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const config = typeConfig[n.type]
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`bg-gray-900 rounded-xl p-4 border flex gap-4 cursor-pointer transition-colors hover:bg-gray-800/50 ${
                  n.isRead ? "border-gray-800" : "border-l-4 border-l-indigo-500 border-gray-800"
                }`}
              >
                <div className={`mt-0.5 flex-shrink-0 ${config.color}`}>{config.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium text-sm ${n.isRead ? "text-gray-300" : "text-white"}`}>{n.title}</p>
                    <span className="text-xs text-gray-500 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5">{n.message}</p>
                </div>
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
