import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; sprintId: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, sprintId } = await params
  const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { name, goal, startDate, endDate, status } = await req.json()
  const sprint = await prisma.sprint.update({
    where: { id: sprintId, projectId: id },
    data: {
      name,
      goal,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
  })

  return NextResponse.json(sprint)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; sprintId: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, sprintId } = await params
  const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.sprint.delete({ where: { id: sprintId } })
  return NextResponse.json({ success: true })
}
