import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get("period") || "monthly"
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
  const quarter = parseInt(searchParams.get("quarter") || "1")

  let startDate: Date
  let endDate: Date
  const now = new Date()

  if (period === "daily") {
    const day = searchParams.get("day") ? new Date(searchParams.get("day")!) : new Date()
    startDate = new Date(day.setHours(0, 0, 0, 0))
    endDate = new Date(day.setHours(23, 59, 59, 999))
  } else if (period === "weekly") {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)
    startDate = weekStart
    endDate = new Date(weekStart)
    endDate.setDate(weekStart.getDate() + 6)
    endDate.setHours(23, 59, 59, 999)
  } else if (period === "monthly") {
    startDate = new Date(year, month - 1, 1)
    endDate = new Date(year, month, 0, 23, 59, 59, 999)
  } else if (period === "quarterly") {
    const qStart = (quarter - 1) * 3
    startDate = new Date(year, qStart, 1)
    endDate = new Date(year, qStart + 3, 0, 23, 59, 59, 999)
  } else {
    startDate = new Date(year, 0, 1)
    endDate = new Date(year, 11, 31, 23, 59, 59, 999)
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: startDate, lte: endDate } },
    include: { category: true },
    orderBy: { date: "desc" },
  })

  return NextResponse.json(transactions)
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { amount, type, categoryId, note, date } = await req.json()
  if (!amount || !type || !categoryId) {
    return NextResponse.json({ error: "amount, type and categoryId required" }, { status: 400 })
  }

  const transaction = await prisma.transaction.create({
    data: {
      amount,
      type,
      categoryId,
      note,
      date: date ? new Date(date) : new Date(),
      userId: user.id,
    },
    include: { category: true },
  })

  return NextResponse.json(transaction, { status: 201 })
}
