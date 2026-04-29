import { PrismaClient } from '../../prisma/generated/client/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

// In Prisma 7, the adapter constructor expects a config object with the URL
const dbPath = path.join(process.cwd(), 'prisma/dev.db')
const dbConfig = { url: 'file:' + dbPath };
const adapter = new PrismaBetterSqlite3(dbConfig);

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
