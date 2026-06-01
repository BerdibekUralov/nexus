import "dotenv/config"
import bcrypt from "bcryptjs"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  ssl: true,
})
const adapter = new PrismaPg(pool)
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
