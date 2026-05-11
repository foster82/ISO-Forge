import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { BuildEngine } from './build-engine'
import { QEMURunner } from './qemu-runner'
import { prisma } from './prisma'
import { logEvents } from './events'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
})

// 1. Define the Queues
export const buildQueue = new Queue('build-queue', { connection })

// 2. Define Worker Logic
export const setupWorkers = () => {
  console.log(`Connecting to Redis at: ${redisUrl}`)
  
  const worker = new Worker(
    'build-queue',
    async (job: Job) => {
      const { type, jobId, payload } = job.data
      console.log(`[WORKER] Starting job ${job.id} (Type: ${type}, JobID: ${jobId})`)

      if (type === 'build') {
        await handleBuildJob(jobId, payload)
      } else if (type === 'boot-test') {
        await handleBootTestJob(jobId, payload)
      }
    },
    { 
      connection: new Redis(redisUrl, { maxRetriesPerRequest: null }),
      concurrency: 1,
      lockDuration: 60000, // 60 seconds
      maxStalledCount: 3,
      stalledInterval: 30000 // Check for stalls every 30s
    }
  )

  worker.on('completed', (job) => {
    console.log(`[WORKER] Job ${job.id} completed successfully`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[WORKER] Job ${job?.id} failed:`, err)
  })

  worker.on('stalled', (jobId) => {
    console.warn(`[WORKER] Job ${jobId} stalled`)
  })

  console.log('BullMQ Workers initialized and listening...')
}

import { BuildOptions } from './build-engine'
import { TestOptions } from './qemu-runner'

async function handleBuildJob(jobId: string, payload: Omit<BuildOptions, 'onLog'>) {
  try {
    await prisma.buildJob.update({
      where: { id: jobId },
      data: { status: 'BUILDING' }
    })

    await BuildEngine.createCustomImage({
      ...payload,
      onLog: (msg: string) => {
        logEvents.emitLog(jobId, msg, 'build')
        prisma.$executeRaw`UPDATE BuildJob SET log = log || ${msg + '\n'} WHERE id = ${jobId}`.catch(e => {
          console.error('Failed to append log:', e)
        })
      }
    })

    await prisma.buildJob.update({
      where: { id: jobId },
      data: { 
        status: 'COMPLETED', 
        completedAt: new Date(),
        outputPath: payload.outputPath
      }
    })
  } catch (error: unknown) {
    const currentJob = await prisma.buildJob.findUnique({ where: { id: jobId } })
    const errorMessage = error instanceof Error ? error.message : String(error)
    await prisma.buildJob.update({
      where: { id: jobId },
      data: { 
        status: 'FAILED', 
        log: (currentJob?.log || '') + `\nFATAL ERROR: ${errorMessage}` 
      }
    })
    throw error
  }
}

async function handleBootTestJob(jobId: string, payload: Omit<TestOptions, 'onLog'>) {
  try {
    await prisma.buildJob.update({
      where: { id: jobId },
      data: { 
        bootTestStatus: 'RUNNING',
        bootTestLog: 'Initialising QEMU...\n'
      }
    })

    const success = await QEMURunner.testBoot({
      ...payload,
      onLog: async (msg: string) => {
        logEvents.emitLog(jobId, msg, 'boot')
        prisma.$executeRaw`UPDATE BuildJob SET bootTestLog = IFNULL(bootTestLog, '') || ${msg} WHERE id = ${jobId}`.catch(e => {
          console.error('Failed to append boot test log:', e)
        })
      }
    })

    await prisma.buildJob.update({
      where: { id: jobId },
      data: { bootTestStatus: success ? 'PASSED' : 'FAILED' }
    })
  } catch (error: unknown) {
    const currentJob = await prisma.buildJob.findUnique({ where: { id: jobId } })
    const errorMessage = error instanceof Error ? error.message : String(error)
    await prisma.buildJob.update({
      where: { id: jobId },
      data: { 
        bootTestStatus: 'FAILED',
        bootTestLog: (currentJob?.bootTestLog || '') + `\n[FATAL ERROR] ${errorMessage}`
      }
    })
    throw error
  }
}
