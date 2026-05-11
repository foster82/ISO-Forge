import { PrismaClient } from './generated/client/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'
import bcrypt from 'bcryptjs'

// Determine DB URL - if in docker it might be /app/data/iso-forge.db
const dbUrl = process.env.DATABASE_URL || ('file:' + path.join(process.cwd(), 'prisma/dev.db'))
const dbConfig = { url: dbUrl };
const adapter = new PrismaBetterSqlite3(dbConfig);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Seed Base Image
  const ubuntu = await prisma.baseImage.upsert({
    where: { id: 'ubuntu-24-04-server' },
    update: {},
    create: {
      id: 'ubuntu-24-04-server',
      name: 'Ubuntu 24.04.1 Server',
      version: '24.04.1',
      filename: 'ubuntu-24.04.1-live-server-amd64.iso',
      path: '/app/storage/base/ubuntu-24.04.1-live-server-amd64.iso'
    },
  })
  console.log('Seeded base image:', ubuntu.name)

  // 2. Seed Admin User
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'password'
  const hashedPassword = await bcrypt.hash(adminPassword, 10)
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      authSource: 'LOCAL'
    }
  })
  console.log('Seeded admin user:', admin.username)

  // 3. Ensure Global Settings
  await prisma.globalSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'ISO Forge'
    }
  })
  console.log('Seeded global settings')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
