export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type NotificationType = "TASK_DUE_TODAY" | "TASK_OVERDUE" | "TASK_DUE_SOON" | "DAILY_SUMMARY"

export async function GET() {
  const now = new Date()
  const today = new Date(now.setHours(0, 0, 0, 0))
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const dayAfter = new Date(today)
  dayAfter.setDate(today.getDate() + 2)

  const overdue = await prisma.task.findMany({
    where: { deadline: { lt: today }, status: { notIn: ["DONE"] } },
    include: { assignees: { include: { user: true } } },
  })

  const dueToday = await prisma.task.findMany({
    where: { deadline: { gte: today, lt: tomorrow }, status: { notIn: ["DONE"] } },
    include: { assignees: { include: { user: true } } },
  })

  const dueSoon = await prisma.task.findMany({
    where: { deadline: { gte: tomorrow, lt: dayAfter }, status: { notIn: ["DONE"] } },
    include: { assignees: { include: { user: true } } },
  })

  const notifications: { type: NotificationType; title: string; message: string; userId: string; taskId: string }[] = []

  for (const task of overdue) {
    for (const a of task.assignees) {
      notifications.push({ type: "TASK_OVERDUE", title: "Task Overdue", message: `"${task.title}" is overdue`, userId: a.userId, taskId: task.id })
    }
  }

  for (const task of dueToday) {
    for (const a of task.assignees) {
      notifications.push({ type: "TASK_DUE_TODAY", title: "Due Today", message: `"${task.title}" is due today`, userId: a.userId, taskId: task.id })
    }
  }

  for (const task of dueSoon) {
    for (const a of task.assignees) {
      notifications.push({ type: "TASK_DUE_SOON", title: "Due Tomorrow", message: `"${task.title}" is due tomorrow`, userId: a.userId, taskId: task.id })
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }

  const users = await prisma.user.findMany({ select: { id: true } })
  const summaries = users.map((u: { id: string }) => ({
    type: "DAILY_SUMMARY" as const,
    title: "Daily Summary",
    message: `Good morning! Check your tasks for today.`,
    userId: u.id,
  }))

  if (summaries.length > 0) {
    await prisma.notification.createMany({ data: summaries })
  }

  return NextResponse.json({ created: notifications.length + summaries.length })
}
