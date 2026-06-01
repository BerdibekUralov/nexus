import ws from "ws"
import { neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"

neonConfig.webSocketConstructor = ws

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client")

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

type PrismaClientInstance = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as { prisma: PrismaClientInstance }

export const prisma: PrismaClientInstance =
  globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
