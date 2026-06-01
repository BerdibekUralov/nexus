import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, icon, color, type } = await req.json()
  if (!name || !type) return NextResponse.json({ error: "Name and type required" }, { status: 400 })

  const category = await prisma.category.create({
    data: { name, icon: icon || "tag", color: color || "#6366f1", type, userId: user.id },
  })

  return NextResponse.json(category, { status: 201 })
}
