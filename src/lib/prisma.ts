import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client")

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
  const pool = new Pool({ connectionString, ssl: true })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

type PrismaClientInstance = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as { prisma: PrismaClientInstance }

export const prisma: PrismaClientInstance =
  globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
