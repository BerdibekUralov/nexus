import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const habits = await prisma.habit.findMany({
    where: { userId: user.id },
    include: { logs: { orderBy: { date: "desc" } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(habits)
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description, icon, color, goalDays } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const habit = await prisma.habit.create({
    data: { name, description, icon: icon || "target", color: color || "#6366f1", goalDays: goalDays || 30, userId: user.id },
  })

  return NextResponse.json(habit, { status: 201 })
}
