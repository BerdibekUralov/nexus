"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, CheckSquare, Activity, DollarSign,
  BookOpen, Bell, LogOut, Users, ChevronLeft, ChevronRight, Menu, X,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const userNavItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/habits", icon: Activity, label: "Habits" },
  { href: "/finance", icon: DollarSign, label: "Finance" },
  { href: "/knowledge", icon: BookOpen, label: "Knowledge" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
]

const adminNavItems = [
  { href: "/admin", icon: Users, label: "User Management" },
]

export function Sidebar({ user }: { user: { name: string; email: string; role: string } }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAdmin = user.role === "ADMIN"
  const navItems = isAdmin ? adminNavItems : userNavItems

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  const navContent = (
    <>
      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const active = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info + Logout */}
      <div className="px-2 py-4 border-t border-gray-800 space-y-1">
        {!collapsed && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && "Logout"}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        "md:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-gray-900 border-r border-gray-800 transition-transform duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800">
          <div>
            <span className="text-lg font-bold text-white tracking-tight">Nexus</span>
            {isAdmin && <span className="ml-2 text-xs text-indigo-400 font-medium bg-indigo-500/10 px-1.5 py-0.5 rounded">Admin</span>}
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col h-full bg-gray-900 border-r border-gray-800 transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}>
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800">
          {!collapsed && (
            <div>
              <span className="text-lg font-bold text-white tracking-tight">Nexus</span>
              {isAdmin && <span className="ml-2 text-xs text-indigo-400 font-medium bg-indigo-500/10 px-1.5 py-0.5 rounded">Admin</span>}
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ml-auto"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        {navContent}
      </aside>
    </>
  )
}
