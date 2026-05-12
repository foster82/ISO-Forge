'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin, requireAuth } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { RedfishEngine } from '@/lib/redfish-engine'
import crypto from 'crypto'
import { auditLog, AuditAction } from '@/lib/audit'

export async function createBareMetalProvider(formData: FormData) {
  await requireAdmin()
  
  const name = formData.get('name') as string
  const providerType = formData.get('providerType') as string
  const managementIp = formData.get('managementIp') as string
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  await prisma.bareMetalProvider.create({
    data: { name, providerType, managementIp, username, password }
  })

  revalidatePath('/settings')
}

export async function deleteBareMetalProvider(id: string) {
  await requireAdmin()
  const provider = await prisma.bareMetalProvider.findUnique({ where: { id } })
  if (provider) {
    await auditLog('BM_DELETE', { resourceId: id, resourceName: provider.name })
  }
  await prisma.bareMetalProvider.delete({ where: { id } })
  revalidatePath('/settings')
}

export async function deployToBareMetal(jobId: string, providerId: string, forceReboot: boolean) {
  const user = await requireAuth()
  
  const provider = await prisma.bareMetalProvider.findUnique({ where: { id: providerId } })
  const job = await prisma.buildJob.findUnique({ where: { id: jobId } })

  if (!provider || !job) {
    return { success: false, message: 'Provider or Job not found.' }
  }

  // 1. Generate secure token (valid for 4 hours)
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 4)

  await prisma.virtualMediaToken.create({
    data: {
      token,
      jobId,
      expiresAt
    }
  })

  // 2. Construct public URL for BMC
  // In a real environment, this should be the public-facing URL of the ISO Forge instance
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const isoUrl = `${baseUrl}/api/vmedia/${token}`

  console.log(`[BARE-METAL] Deploying job ${jobId} to ${provider.name} (${provider.managementIp})`)
  console.log(`[BARE-METAL] VMedia URL: ${isoUrl}`)

  await auditLog('BM_DEPLOY', { 
    resourceId: providerId, 
    resourceName: provider.name,
    details: { jobId, forceReboot }
  })

  // 3. Trigger Redfish Mount
  const mountResult = await RedfishEngine.mountIso(provider, isoUrl)
  if (!mountResult.success) return mountResult

  // 4. Optional Power Cycle
  if (forceReboot) {
    const rebootResult = await RedfishEngine.powerCycle(provider)
    if (!rebootResult.success) {
      return { success: true, message: `ISO mounted, but reboot failed: ${rebootResult.message}` }
    }
  }

  return { success: true, message: `Successfully deployed ISO to ${provider.name}.` }
}

export async function getServerStatusAction(id: string) {
  await requireAuth()
  const provider = await prisma.bareMetalProvider.findUnique({ where: { id } })
  if (!provider) return { success: false, message: 'Provider not found' }

  return await RedfishEngine.getSystemStatus(provider)
}

export async function controlServerPowerAction(id: string, action: 'On' | 'ForceOff' | 'ForceRestart') {
  await requireAdmin()
  const provider = await prisma.bareMetalProvider.findUnique({ where: { id } })
  if (!provider) return { success: false, message: 'Provider not found' }

  const auditMap: Record<string, AuditAction> = {
    'On': 'BM_POWER_ON',
    'ForceOff': 'BM_POWER_OFF',
    'ForceRestart': 'BM_REBOOT'
  }
  await auditLog(auditMap[action] || 'BM_REBOOT', { resourceId: id, resourceName: provider.name })

  return await RedfishEngine.powerAction(provider, action)
}
