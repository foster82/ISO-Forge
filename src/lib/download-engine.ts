import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'

export class DownloadEngine {
  static async downloadIso(url: string, targetPath: string): Promise<boolean> {
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    
    return new Promise((resolve) => {
      // Use wget for robust background downloading
      // -q: quiet, but shows errors
      // -O: target output file
      const wget = spawn('wget', ['-q', '-O', targetPath, url])

      wget.on('close', (code) => {
        if (code === 0) {
          resolve(true)
        } else {
          resolve(false)
        }
      })

      wget.on('error', () => {
        resolve(false)
      })
    })
  }
}
