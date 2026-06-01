import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const directions = await prisma.direction.findMany({
    where: { userId: user.id },
    include: {
      courses: {
        include: {
          modules: { include: { units: { select: { id: true, isCompleted: true } } } },
          tags: { include: { tag: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(directions)
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description, color, icon } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const direction = await prisma.direction.create({
    data: { name, description, color: color || "#6366f1", icon: icon || "book-open", userId: user.id },
  })

  return NextResponse.json(direction, { status: 201 })
}
