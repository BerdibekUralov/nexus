import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { CheckSquare, Activity, DollarSign, BookOpen, TrendingUp, Clock } from "lucide-react"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value!
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  const userId = session!.user.id

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const [projects, habits, habitLogsToday, monthlyExpense, monthlyIncome, directions, unreadNotifs, overdueTasks] =
    await Promise.all([
      prisma.project.count({ where: { ownerId: userId } }),
      prisma.habit.findMany({ where: { userId, isArchived: false }, include: { logs: { where: { date: today } } } }),
      prisma.habitLog.count({ where: { userId, date: today } }),
      prisma.transaction.aggregate({ where: { userId, type: "EXPENSE", date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { userId, type: "INCOME", date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
      prisma.direction.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.task.count({ where: { project: { ownerId: userId }, deadline: { lt: today }, status: { notIn: ["DONE"] } } }),
    ])

  const habitsCompleted = habits.filter((h: { logs: unknown[] }) => h.logs.length > 0).length
  const totalHabits = habits.length

  const stats = [
    { label: "Projects", value: projects, icon: CheckSquare, href: "/tasks", color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Habits Today", value: `${habitsCompleted}/${totalHabits}`, icon: Activity, href: "/habits", color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Monthly Expense", value: formatCurrency(Number(monthlyExpense._sum.amount || 0)), icon: DollarSign, href: "/finance", color: "text-red-400", bg: "bg-red-500/10" },
    { label: "Monthly Income", value: formatCurrency(Number(monthlyIncome._sum.amount || 0)), icon: TrendingUp, href: "/finance", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Directions", value: directions, icon: BookOpen, href: "/knowledge", color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Overdue Tasks", value: overdueTasks, icon: Clock, href: "/tasks", color: "text-orange-400", bg: "bg-orange-500/10" },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1 text-sm">
          {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-400 font-medium">{s.label}</span>
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon size={16} className={s.color} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Link>
        ))}
      </div>

      {unreadNotifs > 0 && (
        <div className="mt-6 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
          <p className="text-indigo-300 text-sm">
            You have <span className="font-bold">{unreadNotifs}</span> unread notification{unreadNotifs > 1 ? "s" : ""}
          </p>
          <Link href="/notifications" className="text-indigo-400 text-sm font-medium hover:text-indigo-300">
            View all
          </Link>
        </div>
      )}
    </div>
  )
}
