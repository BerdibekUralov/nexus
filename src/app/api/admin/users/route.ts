export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, avatar: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { email, name, password, role } = await req.json()

  if (!email || !name || !password) {
    return NextResponse.json({ error: "Email, name and password required" }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return NextResponse.json({ error: "Email already in use" }, { status: 409 })

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email, name, password: hashed, role: role || "USER" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
