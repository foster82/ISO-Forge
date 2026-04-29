import { PrismaClient } from './generated/client/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

// Use absolute path for consistency
const dbPath = path.join(process.cwd(), 'prisma/dev.db')
const dbConfig = { url: 'file:' + dbPath };
const adapter = new PrismaBetterSqlite3(dbConfig);
const prisma = new PrismaClient({ adapter });

async function main() {
  const ubuntu = await prisma.baseImage.upsert({
    where: { id: 'ubuntu-24-04-server' },
    update: {},
    create: {
      id: 'ubuntu-24-04-server',
      name: 'Ubuntu 24.04.1 Server',
      version: '24.04.1',
      filename: 'ubuntu-24.04.1-live-server-amd64.iso',
      path: '/home/foster/iso-forge/storage/base/ubuntu-24.04.1-live-server-amd64.iso'
    },
  })

  console.log('Seeded base image:', ubuntu.name)
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
