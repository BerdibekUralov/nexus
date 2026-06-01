import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description, platform, duration, directionId, tags } = await req.json()
  if (!name || !directionId) return NextResponse.json({ error: "name and directionId required" }, { status: 400 })

  const direction = await prisma.direction.findFirst({ where: { id: directionId, userId: user.id } })
  if (!direction) return NextResponse.json({ error: "Direction not found" }, { status: 404 })

  const course = await prisma.course.create({
    data: {
      name,
      description,
      platform,
      duration,
      directionId,
      tags: tags?.length
        ? {
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
          }
        : undefined,
    },
    include: { tags: { include: { tag: true } } },
  })

  return NextResponse.json(course, { status: 201 })
}
