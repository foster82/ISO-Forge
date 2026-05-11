'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin, requireAuth } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import fsSync from 'fs'
import { buildQueue } from '@/lib/queue'
import { revalidatePath } from 'next/cache'

export async function deleteJob(id: string, redirectPath?: string, _formData?: FormData) {
  await requireAdmin()
  const job = await prisma.buildJob.findUnique({ 
    where: { id },
    include: { profile: true } 
  })
  
  if (job) {
    if (job.outputPath && fsSync.existsSync(job.outputPath)) {
      try {
        fsSync.unlinkSync(job.outputPath)
      } catch (e) {
        console.error(`Failed to delete build file ${job.outputPath}:`, e)
      }
    }
    await prisma.buildJob.delete({ where: { id } })
  }
  
  if (redirectPath) {
    redirect(redirectPath)
  } else if (job) {
    revalidatePath(`/profiles/${job.profileId}`)
    revalidatePath('/')
  }
}

export async function runBootTest(id: string, _formData?: FormData) {
  try {
    console.log(`[BOOT-TEST] Triggering test for job: ${id}`)
    await requireAuth()
    
    const job = await prisma.buildJob.findUnique({
      where: { id },
      include: { profile: { include: { baseImage: true } } }
    })

    if (!job) {
      console.error(`[BOOT-TEST] Job not found: ${id}`)
      return
    }

    if (!job.outputPath) {
      const errorMsg = 'Build output path is missing from database. Please rebuild the image.'
      console.error(`[BOOT-TEST] ${errorMsg} Job: ${id}`)
      await prisma.buildJob.update({
        where: { id },
        data: { bootTestStatus: 'FAILED', bootTestLog: `[ERROR] ${errorMsg}\n` }
      })
      revalidatePath(`/jobs/${id}`)
      return
    }

    if (!fsSync.existsSync(job.outputPath)) {
      const errorMsg = `Build output file not found on disk at: ${job.outputPath}`
      console.error(`[BOOT-TEST] ${errorMsg} Job: ${id}`)
      await prisma.buildJob.update({
        where: { id },
        data: { bootTestStatus: 'FAILED', bootTestLog: `[ERROR] ${errorMsg}\n` }
      })
      revalidatePath(`/jobs/${id}`)
      return
    }

    console.log(`[BOOT-TEST] Updating database status to PENDING for job: ${id}`)
    
    // Find a free VNC display number (1-100)
    const activeJobs = await prisma.buildJob.findMany({
      where: { bootTestStatus: { in: ['PENDING', 'RUNNING'] }, vncPort: { not: null } },
      select: { vncPort: true }
    })
    const usedPorts = activeJobs.map(j => j.vncPort as number)
    let vncPort = 1
    while (usedPorts.includes(vncPort)) {
      vncPort++
    }

    await prisma.buildJob.update({
      where: { id: id },
      data: { 
        bootTestStatus: 'PENDING',
        bootTestLog: 'Job queued...\n',
        vncPort: vncPort
      }
    })

    console.log(`[BOOT-TEST] Adding job to BullMQ: ${id} with VNC Display :${vncPort}`)
    // Add to BullMQ
    await buildQueue.add('boot-test', {
      type: 'boot-test',
      jobId: id,
      payload: {
        imagePath: job.outputPath,
        imageType: job.profile.baseImage.imageType as 'ISO' | 'CLOUD_IMAGE',
        arch: job.profile.baseImage.arch,
        vncDisplay: vncPort
      }
    })

    console.log(`[BOOT-TEST] Successfully queued job: ${id}`)
    revalidatePath(`/jobs/${id}`)
  } catch (error: unknown) {
    console.error(`[BOOT-TEST] Critical error in runBootTest for job ${id}:`, error)
    // Try to update DB with the error if possible
    try {
      const currentJob = await prisma.buildJob.findUnique({ where: { id } })
      const errorMessage = error instanceof Error ? error.message : String(error)
      await prisma.buildJob.update({
        where: { id },
        data: { 
          bootTestStatus: 'FAILED',
          bootTestLog: (currentJob?.bootTestLog || '') + `\n[CRITICAL ERROR] ${errorMessage}`
        }
      })
      revalidatePath(`/jobs/${id}`)
    } catch (e) {
      console.error('[BOOT-TEST] Failed to log critical error to DB:', e)
    }
  }
}

export async function cleanupJobs(type: 'FAILED' | 'ALL' | 'OLD') {
  await requireAdmin()
  
  let where = {}
  if (type === 'FAILED') {
    where = { status: 'FAILED' }
  } else if (type === 'OLD') {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    where = { createdAt: { lt: weekAgo } }
  }

  const jobs = await prisma.buildJob.findMany({ where })
  let count = 0

  for (const job of jobs) {
    if (job.outputPath && fsSync.existsSync(job.outputPath)) {
      try {
        fsSync.unlinkSync(job.outputPath)
      } catch (e) {
        console.error(`Failed to delete build file ${job.outputPath}:`, e)
      }
    }
    await prisma.buildJob.delete({ where: { id: job.id } })
    count++
  }

  revalidatePath('/')
  revalidatePath('/jobs')
  return count
}
