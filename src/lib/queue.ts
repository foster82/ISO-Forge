import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { BuildEngine } from './build-engine'
import { QEMURunner } from './qemu-runner'
import { prisma } from './prisma'
import { logEvents } from './events'
import fsSync from 'fs'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
})

// 1. Define the Queues
export const buildQueue = new Queue('build-queue', { connection })

// 2. Define Worker Logic
export const setupWorkers = () => {
  console.log(`Connecting to Redis at: ${redisUrl}`)
  
  // Schedule repeatable cleanup job (every hour)
  buildQueue.add('cleanup', { type: 'cleanup' }, {
    repeat: { pattern: '0 * * * *' }
  }).catch(e => console.error('Failed to schedule cleanup job:', e))

  // Schedule base image sync (every 12 hours)
  buildQueue.add('sync-images', { type: 'sync-images' }, {
    repeat: { pattern: '0 */12 * * *' }
  }).catch(e => console.error('Failed to schedule sync job:', e))
  
  const worker = new Worker(
    'build-queue',
    async (job: Job) => {
      const { type, jobId, payload } = job.data
      console.log(`[WORKER] Starting job ${job.id} (Type: ${type}, JobID: ${jobId})`)

      if (type === 'build') {
        await handleBuildJob(jobId, payload)
      } else if (type === 'boot-test') {
        await handleBootTestJob(jobId, payload)
      } else if (type === 'cleanup') {
        await handleCleanupJob()
      } else if (type === 'sync-images') {
        await handleSyncImagesJob()
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

async function handleCleanupJob() {
  console.log('[CLEANUP-WORKER] Running automated cleanup...')
  const settings = await prisma.globalSettings.findUnique({ where: { id: 'default' } })
  if (!settings || !settings.autoCleanupEnabled) {
    console.log('[CLEANUP-WORKER] Auto-cleanup is disabled.')
    return
  }

  // 1. Delete old jobs by age
  const ageThreshold = new Date()
  ageThreshold.setDate(ageThreshold.getDate() - settings.jobRetentionDays)
  
  const oldJobs = await prisma.buildJob.findMany({
    where: { createdAt: { lt: ageThreshold } }
  })
  
  console.log(`[CLEANUP-WORKER] Found ${oldJobs.length} jobs older than ${settings.jobRetentionDays} days.`)
  for (const job of oldJobs) {
    if (job.outputPath && fsSync.existsSync(job.outputPath)) {
      try { fsSync.unlinkSync(job.outputPath) } catch (e) { console.error(e) }
    }
    await prisma.buildJob.delete({ where: { id: job.id } })
  }

  // 2. Enforce build count per profile
  const profiles = await prisma.profile.findMany()
  for (const profile of profiles) {
    const builds = await prisma.buildJob.findMany({
      where: { profileId: profile.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      skip: settings.buildRetentionCount
    })
    
    if (builds.length > 0) {
      console.log(`[CLEANUP-WORKER] Profile ${profile.name}: Removing ${builds.length} builds exceeding limit of ${settings.buildRetentionCount}.`)
      for (const job of builds) {
        if (job.outputPath && fsSync.existsSync(job.outputPath)) {
          try { fsSync.unlinkSync(job.outputPath) } catch (e) { console.error(e) }
        }
        await prisma.buildJob.delete({ where: { id: job.id } })
      }
    }
  }
}

import { SourceEngine } from './source-engine'

async function handleSyncImagesJob() {
  console.log('[SYNC-WORKER] Checking for base image updates...')
  const images = await prisma.baseImage.findMany()
  
  for (const image of images) {
    try {
      const upstream = await SourceEngine.findBestMatch(image)
      if (upstream) {
        await prisma.baseImage.update({
          where: { id: image.id },
          data: {
            upstreamVersion: upstream.version,
            upstreamUrl: upstream.url
          }
        })
      }
    } catch (e) {
      console.error(`[SYNC-WORKER] Failed to sync ${image.name}:`, e)
    }
  }
}

import { WebhookEngine } from './webhook-engine'

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

    const finalJob = await prisma.buildJob.findUnique({
      where: { id: jobId },
      include: { profile: true }
    })
    if (finalJob) {
      await WebhookEngine.trigger('BUILD_COMPLETED', {
        jobId: finalJob.id,
        profileName: finalJob.profile.name,
        version: finalJob.version,
        outputPath: finalJob.outputPath
      })
    }
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

    const finalJob = await prisma.buildJob.findUnique({
      where: { id: jobId },
      include: { profile: true }
    })
    if (finalJob) {
      await WebhookEngine.trigger('BUILD_FAILED', {
        jobId: finalJob.id,
        profileName: finalJob.profile.name,
        error: errorMessage
      })
    }
    throw error
  }
}

async function handleBootTestJob(jobId: string, payload: Omit<TestOptions, 'onLog' | 'jobId'>) {
  try {
    await prisma.buildJob.update({
      where: { id: jobId },
      data: { 
        bootTestStatus: 'RUNNING',
        bootTestLog: `Initialising QEMU (${payload.arch || 'amd64'})...\n`
      }
    })

    const success = await QEMURunner.testBoot({
      ...payload,
      jobId: jobId,
      onLog: async (msg: string) => {
        logEvents.emitLog(jobId, msg, 'boot')
        prisma.$executeRaw`UPDATE BuildJob SET bootTestLog = IFNULL(bootTestLog, '') || ${msg} WHERE id = ${jobId}`.catch(e => {
          console.error('Failed to append boot test log:', e)
        })
      },
      onScreenshot: async (screenshotPath: string) => {
        await prisma.buildJob.update({
          where: { id: jobId },
          data: { bootTestScreenshot: screenshotPath }
        })
      }
    })

    await prisma.buildJob.update({
      where: { id: jobId },
      data: { 
        bootTestStatus: success ? 'PASSED' : 'FAILED',
        vncPort: null 
      }
    })

    const finalJob = await prisma.buildJob.findUnique({
      where: { id: jobId },
      include: { profile: true }
    })
    if (finalJob) {
      await WebhookEngine.trigger(success ? 'BOOT_TEST_PASSED' : 'BOOT_TEST_FAILED', {
        jobId: finalJob.id,
        profileName: finalJob.profile.name,
        bootTestStatus: finalJob.bootTestStatus
      })
    }
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

    const finalJob = await prisma.buildJob.findUnique({
      where: { id: jobId },
      include: { profile: true }
    })
    if (finalJob) {
      await WebhookEngine.trigger('BOOT_TEST_FAILED', {
        jobId: finalJob.id,
        profileName: finalJob.profile.name,
        error: errorMessage
      })
    }
    throw error
  }
}

