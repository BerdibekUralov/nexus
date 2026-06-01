export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    include: {
      _count: { select: { tasks: true, sprints: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description, color, type } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const project = await prisma.project.create({
    data: { name, description, color: color || "#6366f1", type: type || "KANBAN", ownerId: user.id },
  })

  return NextResponse.json(project, { status: 201 })
}
