import fs from 'fs/promises'
import path from 'path'
import { prisma } from './prisma'

export interface BackupInfo {
  filename: string
  size: number
  createdAt: Date
  path: string
}

export class BackupEngine {
  private static backupDir = path.join(process.cwd(), 'storage', 'backups')

  static async ensureBackupDir() {
    await fs.mkdir(this.backupDir, { recursive: true })
  }

  static async createBackup(): Promise<string> {
    await this.ensureBackupDir()
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.db`
    const backupPath = path.join(this.backupDir, filename)

    // Use SQLite's VACUUM INTO for a consistent, atomic backup of a live database
    // This works while other connections are active.
    await prisma.$executeRawUnsafe(`VACUUM INTO '${backupPath}'`)

    return filename
  }

  static async listBackups(): Promise<BackupInfo[]> {
    await this.ensureBackupDir()
    const files = await fs.readdir(this.backupDir)
    
    const backups = await Promise.all(
      files
        .filter(f => f.endsWith('.db'))
        .map(async (f) => {
          const filePath = path.join(this.backupDir, f)
          const stats = await fs.stat(filePath)
          return {
            filename: f,
            size: stats.size,
            createdAt: stats.mtime,
            path: filePath
          }
        })
    )

    return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  static async deleteBackup(filename: string) {
    const filePath = path.join(this.backupDir, filename)
    // Basic security check to prevent directory traversal
    if (!filePath.startsWith(this.backupDir)) {
      throw new Error('Invalid backup path')
    }
    await fs.unlink(filePath)
  }

  static getBackupPath(filename: string): string {
    const filePath = path.join(this.backupDir, filename)
    if (!filePath.startsWith(this.backupDir)) {
      throw new Error('Invalid backup path')
    }
    return filePath
  }
}
