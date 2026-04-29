import { prisma } from './src/lib/prisma'

async function main() {
  const jobs = await prisma.buildJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { profile: { include: { baseImage: true } } }
  })
  
  for (const job of jobs) {
    console.log(`Job ID: ${job.id}`)
    console.log(`Profile: ${job.profile.name} (Type: ${job.profile.baseImage.imageType})`)
    console.log(`Status: ${job.status}`)
    console.log(`Log Snippet:\n${job.log}`)
    console.log(`Boot Status: ${job.bootTestStatus}`)
    console.log(`Boot Log Snippet:\n${job.bootTestLog}`)
    console.log('---')
  }
}

main()
