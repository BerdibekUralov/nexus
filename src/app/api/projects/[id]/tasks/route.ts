import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const sprintId = searchParams.get("sprintId")

  const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const tasks = await prisma.task.findMany({
    where: { projectId: id, ...(sprintId ? { sprintId } : {}) },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      tags: { include: { tag: true } },
    },
    orderBy: { order: "asc" },
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { title, description, status, priority, deadline, sprintId, assigneeIds, tagIds } = await req.json()
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 })

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status: status || "TODO",
      priority: priority || "SHOULD",
      deadline: deadline ? new Date(deadline) : undefined,
      projectId: id,
      sprintId: sprintId || undefined,
      assignees: assigneeIds?.length ? { create: assigneeIds.map((uid: string) => ({ userId: uid })) } : undefined,
      tags: tagIds?.length ? { create: tagIds.map((tid: string) => ({ tagId: tid })) } : undefined,
    },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      tags: { include: { tag: true } },
    },
  })

  return NextResponse.json(task, { status: 201 })
}
