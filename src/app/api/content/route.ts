import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get("platform")
  const status = searchParams.get("status")

  const items = await prisma.contentItem.findMany({
    where: {
      userId: user.id,
      ...(platform ? { platform: platform as any } : {}),
      ...(status ? { status: status as any } : {}),
    },
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, body: content, platform, status, scheduledAt, publishedAt, tags } = body

  if (!title || !platform) {
    return NextResponse.json({ error: "title and platform are required" }, { status: 400 })
  }

  const item = await prisma.contentItem.create({
    data: {
      title,
      body: content ?? null,
      platform,
      status: status ?? "IDEA",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      tags: tags ?? [],
      userId: user.id,
    },
  })

  return NextResponse.json(item, { status: 201 })
}
