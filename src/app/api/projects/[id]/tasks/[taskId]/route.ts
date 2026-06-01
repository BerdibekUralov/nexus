import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, taskId } = await params
  const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { title, description, status, priority, deadline, sprintId, order, assigneeIds, tagIds } = await req.json()

  const task = await prisma.task.update({
    where: { id: taskId, projectId: id },
    data: {
      title,
      description,
      status,
      priority,
      order,
      sprintId,
      deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
      ...(assigneeIds !== undefined
        ? { assignees: { deleteMany: {}, create: assigneeIds.map((uid: string) => ({ userId: uid })) } }
        : {}),
      ...(tagIds !== undefined
        ? { tags: { deleteMany: {}, create: tagIds.map((tid: string) => ({ tagId: tid })) } }
        : {}),
    },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      tags: { include: { tag: true } },
    },
  })

  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, taskId } = await params
  const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.task.delete({ where: { id: taskId } })
  return NextResponse.json({ success: true })
}
