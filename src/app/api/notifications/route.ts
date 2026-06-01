import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    include: { task: { select: { id: true, title: true, projectId: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(notifications)
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { ids } = await req.json()

  await prisma.notification.updateMany({
    where: { userId: user.id, ...(ids ? { id: { in: ids } } : {}) },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
