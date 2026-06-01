import { NextRequest } from "next/server"
import { prisma } from "./prisma"

export async function getSession(req: NextRequest) {
  const token = req.cookies.get("session")?.value
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) return null
  return session
}

export async function requireAuth(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return null
  return session.user
}

export async function requireAdmin(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user || user.role !== "ADMIN") return null
  return user
}
