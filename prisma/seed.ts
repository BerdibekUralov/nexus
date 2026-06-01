import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
} as ConstructorParameters<typeof PrismaClient>[0])

async function main() {
  const password = await bcrypt.hash("admin123", 10)

  const admin = await prisma.user.upsert({
    where: { email: "admin@nexus.app" },
    update: {},
    create: {
      email: "admin@nexus.app",
      name: "Admin",
      password,
      role: "ADMIN",
    },
  })

  console.log("Admin created:", admin.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
