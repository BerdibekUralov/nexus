import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Sidebar } from "@/components/Sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value

  if (!token) redirect("/login")

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  })

  if (!session || session.expiresAt < new Date()) redirect("/login")

  const { user } = session

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto bg-gray-950 pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
