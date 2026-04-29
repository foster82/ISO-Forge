/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('./generated/client')
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'dev.db')
const sqlite = new Database(dbPath)
const adapter = new PrismaBetterSqlite3(sqlite)

const prisma = new PrismaClient({ adapter })

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
