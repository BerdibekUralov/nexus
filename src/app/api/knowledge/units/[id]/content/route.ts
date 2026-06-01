import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

// POST: create note, flashcard or checklist for a unit
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { type, ...data } = await req.json()

  if (type === "note") {
    const note = await prisma.note.create({ data: { content: data.content, unitId: id } })
    return NextResponse.json(note, { status: 201 })
  }

  if (type === "flashcard") {
    const card = await prisma.flashcard.create({ data: { front: data.front, back: data.back, unitId: id } })
    return NextResponse.json(card, { status: 201 })
  }

  if (type === "checklist") {
    const checklist = await prisma.checklist.create({
      data: {
        title: data.title,
        unitId: id,
        items: data.items?.length
          ? { create: data.items.map((item: string, i: number) => ({ text: item, order: i })) }
          : undefined,
      },
      include: { items: { orderBy: { order: "asc" } } },
    })
    return NextResponse.json(checklist, { status: 201 })
  }

  return NextResponse.json({ error: "Invalid type. Use note, flashcard, or checklist" }, { status: 400 })
}
