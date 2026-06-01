import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { amount, type, categoryId, note, date } = await req.json()

  const tx = await prisma.transaction.updateMany({
    where: { id, userId: user.id },
    data: { amount, type, categoryId, note, date: date ? new Date(date) : undefined },
  })

  if (tx.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.transaction.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ success: true })
}
