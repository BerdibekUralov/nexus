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

const DEFAULT_EXPENSE_CATS = [
  { name: "Food",        icon: "🍔", color: "#f59e0b" },
  { name: "Transport",   icon: "🚗", color: "#06b6d4" },
  { name: "Shopping",    icon: "🛍️", color: "#8b5cf6" },
  { name: "Health",      icon: "💊", color: "#ef4444" },
  { name: "Education",   icon: "📚", color: "#6366f1" },
  { name: "Utilities",   icon: "💡", color: "#f97316" },
  { name: "Entertainment", icon: "🎬", color: "#ec4899" },
  { name: "Other",       icon: "📦", color: "#6b7280" },
]

const DEFAULT_INCOME_CATS = [
  { name: "Salary",      icon: "💼", color: "#10b981" },
  { name: "Freelance",   icon: "💻", color: "#6366f1" },
  { name: "Business",    icon: "🏢", color: "#06b6d4" },
  { name: "Investment",  icon: "📈", color: "#f59e0b" },
  { name: "Gift",        icon: "🎁", color: "#ec4899" },
  { name: "Other",       icon: "💰", color: "#10b981" },
]

async function main() {
  // Admin user
  const password = await bcrypt.hash("admin123", 10)
  const admin = await prisma.user.upsert({
    where: { email: "admin@nexus.app" },
    update: {},
    create: { email: "admin@nexus.app", name: "Admin", password, role: "ADMIN" },
  })
  console.log("Admin:", admin.email)

  // Default categories for admin
  for (const cat of DEFAULT_EXPENSE_CATS) {
    await prisma.category.upsert({
      where: { name_userId_type: { name: cat.name, userId: admin.id, type: "EXPENSE" } },
      update: {},
      create: { ...cat, type: "EXPENSE", userId: admin.id },
    })
  }
  for (const cat of DEFAULT_INCOME_CATS) {
    await prisma.category.upsert({
      where: { name_userId_type: { name: cat.name, userId: admin.id, type: "INCOME" } },
      update: {},
      create: { ...cat, type: "INCOME", userId: admin.id },
    })
  }
  console.log("Default categories created")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
