import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import fs from 'fs'

export async function checkUserQuota(userId: string): Promise<{ allowed: boolean; message?: string }> {
  const settings = await getSettings()
  const quotaMB = settings.defaultStorageQuotaMB

  if (quotaMB <= 0) return { allowed: true }

  const quotaBytes = quotaMB * 1024 * 1024

  const userBuilds = await prisma.buildJob.findMany({
    where: { 
      userId,
      status: 'COMPLETED'
    },
    select: { outputPath: true }
  })

  let totalBytes = 0
  for (const job of userBuilds) {
    if (job.outputPath && fs.existsSync(job.outputPath)) {
      try {
        const stats = fs.statSync(job.outputPath)
        totalBytes += stats.size
      } catch (e) {
        // Ignore
      }
    }
  }

  if (totalBytes >= quotaBytes) {
    return { 
      allowed: false, 
      message: `Storage quota exceeded. You are using ${Math.round(totalBytes / 1024 / 1024)}MB of your ${quotaMB}MB limit. Please delete old builds to free up space.` 
    }
  }

  return { allowed: true }
}
