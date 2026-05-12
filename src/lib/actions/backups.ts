'use server'

import { BackupEngine } from '@/lib/backup-engine'
import { requireAdmin } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { auditLog } from '@/lib/audit'

export async function triggerBackup(_formData?: FormData) {
  await requireAdmin()
  try {
    await BackupEngine.createBackup()
    await auditLog('BACKUP_TRIGGER')
    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('Backup failed:', error)
    return { error: 'Failed to create database backup' }
  }
}

export async function removeBackup(filename: string) {
  await requireAdmin()
  try {
    await BackupEngine.deleteBackup(filename)
    await auditLog('BACKUP_DELETE', { resourceName: filename })
    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete backup:', error)
    return { error: 'Failed to delete backup file' }
  }
}
