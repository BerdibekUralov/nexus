import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId } = await params
  const { isCompleted } = await req.json()

  await prisma.checklistItem.update({ where: { id: itemId }, data: { isCompleted } })
  return NextResponse.json({ success: true })
}
