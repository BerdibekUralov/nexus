export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 })

  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const blocks = await prisma.timeBlock.findMany({
    where: { userId: user.id, date: { gte: start, lte: end } },
    include: { task: { include: { project: true } } },
    orderBy: { startMin: "asc" },
  })

  return NextResponse.json(blocks)
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { taskId, title, date, startMin, endMin, color } = await req.json()
  if (!date || startMin == null || endMin == null) {
    return NextResponse.json({ error: "date, startMin, endMin required" }, { status: 400 })
  }

  const block = await prisma.timeBlock.create({
    data: {
      userId: user.id,
      taskId: taskId || null,
      title: title || null,
      date: new Date(date),
      startMin,
      endMin,
      color: color || "#6366f1",
    },
    include: { task: { include: { project: true } } },
  })

  return NextResponse.json(block, { status: 201 })
}
