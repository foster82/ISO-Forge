import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface StorageStats {
  totalBytes: number
  usedBytes: number
  freeBytes: number
  percentUsed: number
  storageDirSize: number
}

export class SystemStats {
  static async getStorageStats(): Promise<StorageStats> {
    const storagePath = path.join(process.cwd(), 'storage')
    
    try {
      // 1. Get size of the storage directory specifically
      // du -sb returns size in bytes
      const { stdout: duOutput } = await execAsync(`du -sb "${storagePath}"`)
      const storageDirSize = parseInt(duOutput.split('\t')[0])

      // 2. Get overall disk usage for the partition where storage resides
      // df -B1 returns results in bytes
      const { stdout: dfOutput } = await execAsync(`df -B1 "${storagePath}" | tail -1`)
      const parts = dfOutput.trim().split(/\s+/)
      
      const totalBytes = parseInt(parts[1])
      const usedBytes = parseInt(parts[2])
      const freeBytes = parseInt(parts[3])
      const percentUsed = Math.round((usedBytes / totalBytes) * 100)

      return {
        totalBytes,
        usedBytes,
        freeBytes,
        percentUsed,
        storageDirSize
      }
    } catch (error) {
      console.error('Failed to fetch storage stats:', error)
      return {
        totalBytes: 0,
        usedBytes: 0,
        freeBytes: 0,
        percentUsed: 0,
        storageDirSize: 0
      }
    }
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
