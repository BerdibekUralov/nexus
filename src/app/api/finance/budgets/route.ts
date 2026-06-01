export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))

  const budgets = await prisma.budget.findMany({
    where: { userId: user.id, month, year },
    include: { category: true },
  })

  return NextResponse.json(budgets)
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { amount, month, year, categoryId } = await req.json()
  if (!amount || !month || !year || !categoryId) {
    return NextResponse.json({ error: "amount, month, year, categoryId required" }, { status: 400 })
  }

  const budget = await prisma.budget.upsert({
    where: { categoryId_month_year_userId: { categoryId, month, year, userId: user.id } },
    create: { amount, month, year, categoryId, userId: user.id },
    update: { amount },
    include: { category: true },
  })

  return NextResponse.json(budget, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  await prisma.budget.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ success: true })
}
