import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { date } = await req.json()
  const logDate = date ? new Date(date) : new Date()
  logDate.setHours(0, 0, 0, 0)

  const habit = await prisma.habit.findFirst({ where: { id, userId: user.id } })
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const existing = await prisma.habitLog.findUnique({ where: { habitId_date: { habitId: id, date: logDate } } })

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } })
    return NextResponse.json({ completed: false })
  }

  await prisma.habitLog.create({ data: { habitId: id, userId: user.id, date: logDate } })
  return NextResponse.json({ completed: true })
}
