import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const course = await prisma.course.findFirst({
    where: { id, direction: { userId: user.id } },
    include: {
      modules: {
        include: { units: { include: { notes: true, flashcards: true, checklists: { include: { items: { orderBy: { order: "asc" } } } } }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
      tags: { include: { tag: true } },
      direction: true,
    },
  })

  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(course)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { name, description, platform, duration, certificate, tags } = await req.json()

  const course = await prisma.course.findFirst({ where: { id, direction: { userId: user.id } } })
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.course.update({
    where: { id },
    data: {
      name,
      description,
      platform,
      duration,
      certificate,
      ...(tags !== undefined
        ? {
            tags: {
              deleteMany: {},
              create: await Promise.all(
                tags.map(async (tagName: string) => {
                  const tag = await prisma.knowledgeTag.upsert({
                    where: { name: tagName },
                    create: { name: tagName },
                    update: {},
                  })
                  return { tagId: tag.id }
                })
              ),
            },
          }
        : {}),
    },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const course = await prisma.course.findFirst({ where: { id, direction: { userId: user.id } } })
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.course.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
