import { prisma } from './prisma'
import { getCurrentUser } from './auth-utils'

export type AuditAction = 
  | 'PROFILE_CREATE' | 'PROFILE_UPDATE' | 'PROFILE_DELETE' | 'BUILD_START' | 'BUILD_DELETE'
  | 'RECIPE_CREATE' | 'RECIPE_UPDATE' | 'RECIPE_DELETE' | 'RECIPE_CLONE'
  | 'SETTINGS_UPDATE' | 'BACKUP_TRIGGER' | 'BACKUP_DELETE' | 'CLEANUP_RUN'
  | 'BM_DEPLOY' | 'BM_POWER_ON' | 'BM_POWER_OFF' | 'BM_REBOOT' | 'BM_DELETE'
  | 'IMAGE_ADD' | 'IMAGE_DELETE' | 'AUTH_LOGIN' | 'AUTH_LOGOUT'

interface AuditOptions {
  resourceId?: string
  resourceName?: string
  details?: any
}

export async function auditLog(action: AuditAction, options: AuditOptions = {}) {
  try {
    const user = await getCurrentUser()
    
    await prisma.auditLog.create({
      data: {
        action,
        userId: user?.id || null,
        username: user?.username || 'SYSTEM',
        resourceId: options.resourceId || null,
        resourceName: options.resourceName || null,
        details: options.details ? JSON.stringify(options.details) : null
      }
    })
  } catch (error) {
    console.error('[AUDIT-LOG] Failed to create audit entry:', error)
  }
}
