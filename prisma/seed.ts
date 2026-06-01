import "dotenv/config"
import bcrypt from "bcryptjs"
import ws from "ws"
import { neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"

neonConfig.webSocketConstructor = ws

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client")

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const password = await bcrypt.hash("admin123", 10)
  const admin = await prisma.user.upsert({
    where: { email: "admin@nexus.app" },
    update: {},
    create: { email: "admin@nexus.app", name: "Admin", password, role: "ADMIN" },
  })
  console.log("Admin created:", admin.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
