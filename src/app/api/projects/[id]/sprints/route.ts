import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const sprints = await prisma.sprint.findMany({
    where: { projectId: id },
    include: { _count: { select: { tasks: true } } },
    orderBy: { startDate: "asc" },
  })

  return NextResponse.json(sprints)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { name, goal, startDate, endDate } = await req.json()
  if (!name || !startDate || !endDate) {
    return NextResponse.json({ error: "name, startDate and endDate required" }, { status: 400 })
  }

  const sprint = await prisma.sprint.create({
    data: { name, goal, startDate: new Date(startDate), endDate: new Date(endDate), projectId: id },
  })

  return NextResponse.json(sprint, { status: 201 })
}
