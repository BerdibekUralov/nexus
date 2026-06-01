import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const unit = await prisma.unit.findUnique({
    where: { id },
    include: {
      notes: true,
      flashcards: true,
      checklists: { include: { items: { orderBy: { order: "asc" } } } },
    },
  })

  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(unit)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { name, description, order, isCompleted } = await req.json()

  await prisma.unit.update({ where: { id }, data: { name, description, order, isCompleted } })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.unit.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
