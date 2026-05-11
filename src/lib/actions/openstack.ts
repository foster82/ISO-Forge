'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { OpenStackEngine, OpenStackConfig } from '@/lib/openstack-engine'
import { revalidatePath } from 'next/cache'
import fs from 'fs'

export async function pushToOpenStack(jobId: string, config: OpenStackConfig) {
  try {
    await requireAuth()
    
    if (!config.authUrl || !config.username || !config.password || !config.projectName) {
      throw new Error('Incomplete OpenStack configuration provided.')
    }

    const job = await prisma.buildJob.findUnique({
      where: { id: jobId },
      include: { profile: { include: { baseImage: true } } }
    })

    if (!job || job.status !== 'COMPLETED' || !job.outputPath) {
      throw new Error('Build job is not completed or output file is missing.')
    }

    if (!fs.existsSync(job.outputPath)) {
      throw new Error('Build output file not found on disk.')
    }

    // Update job log
    await prisma.buildJob.update({
      where: { id: jobId },
      data: { log: job.log + `\n[OPENSTACK] [${config.authUrl}] Starting push to Glance as ${config.username}...\n` }
    })
    revalidatePath(`/jobs/${jobId}`)

    const imageId = await OpenStackEngine.uploadImage(
      config,
      job.outputPath,
      {
        name: `${job.profile.name} (Build ${jobId.substring(0, 8)})`,
        diskFormat: job.profile.baseImage.imageType === 'ISO' ? 'iso' : 'qcow2',
        containerFormat: 'bare',
        visibility: 'private'
      }
    )

    await prisma.buildJob.update({
      where: { id: jobId },
      data: { log: job.log + `\n[OPENSTACK] Successfully uploaded image. Glance ID: ${imageId}\n` }
    })
    
    revalidatePath(`/jobs/${jobId}`)
    return { success: true, imageId }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[OPENSTACK-PUSH] Error:', errorMessage)
    
    try {
      const job = await prisma.buildJob.findUnique({ where: { id: jobId } })
      await prisma.buildJob.update({
        where: { id: jobId },
        data: { log: (job?.log || '') + `\n[OPENSTACK ERROR] ${errorMessage}\n` }
      })
      revalidatePath(`/jobs/${jobId}`)
    } catch (e) {
      console.error('Failed to log OpenStack error to DB:', e)
    }

    return { success: false, error: errorMessage }
  }
}
