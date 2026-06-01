import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const tags = await prisma.tag.findMany({ where: { projectId: id }, orderBy: { name: "asc" } })
  return NextResponse.json(tags)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { name, color } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const tag = await prisma.tag.create({ data: { name, color: color || "#94a3b8", projectId: id } })
  return NextResponse.json(tag, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { tagId } = await req.json()
  await prisma.tag.deleteMany({ where: { id: tagId, projectId: id } })
  return NextResponse.json({ success: true })
}
