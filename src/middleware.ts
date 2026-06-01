import { NextRequest, NextResponse } from "next/server"

const publicPaths = ["/login", "/api/auth/login"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))
  const token = req.cookies.get("session")?.value

  if (!isPublic && !token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isPublic && token && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
