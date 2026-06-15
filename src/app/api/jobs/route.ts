import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get("platform")
  const status = searchParams.get("status")

  const jobs = await prisma.jobApplication.findMany({
    where: {
      userId: user.id,
      ...(platform ? { platform: platform as any } : {}),
      ...(status ? { status: status as any } : {}),
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(jobs)
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, company, platform, status, url, notes, appliedAt } = body

  if (!title || !platform) {
    return NextResponse.json({ error: "title and platform are required" }, { status: 400 })
  }

  const job = await prisma.jobApplication.create({
    data: {
      title,
      company: company ?? null,
      platform,
      status: status ?? "SAVED",
      url: url ?? null,
      notes: notes ?? null,
      appliedAt: appliedAt ? new Date(appliedAt) : null,
      userId: user.id,
    },
  })

  return NextResponse.json(job, { status: 201 })
}
