import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description, moduleId, order } = await req.json()
  if (!name || !moduleId) return NextResponse.json({ error: "name and moduleId required" }, { status: 400 })

  const unit = await prisma.unit.create({
    data: { name, description, moduleId, order: order || 0 },
  })

  return NextResponse.json(unit, { status: 201 })
}
