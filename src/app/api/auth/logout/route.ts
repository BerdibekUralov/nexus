import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value
  if (token) {
    await prisma.session.deleteMany({ where: { token } })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete("session")
  return response
}
