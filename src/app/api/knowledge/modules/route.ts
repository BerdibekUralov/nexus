export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description, courseId, order } = await req.json()
  if (!name || !courseId) return NextResponse.json({ error: "name and courseId required" }, { status: 400 })

  const course = await prisma.course.findFirst({ where: { id: courseId, direction: { userId: user.id } } })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })

  const module = await prisma.courseModule.create({
    data: { name, description, courseId, order: order || 0 },
  })

  return NextResponse.json(module, { status: 201 })
}
