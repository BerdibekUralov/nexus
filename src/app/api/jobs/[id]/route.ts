import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const job = await prisma.jobApplication.findUnique({ where: { id } })
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const updated = await prisma.jobApplication.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.company !== undefined && { company: body.company }),
      ...(body.platform !== undefined && { platform: body.platform }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.url !== undefined && { url: body.url }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.appliedAt !== undefined && { appliedAt: body.appliedAt ? new Date(body.appliedAt) : null }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const job = await prisma.jobApplication.findUnique({ where: { id } })
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.jobApplication.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
