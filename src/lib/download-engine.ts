import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'

export class DownloadEngine {
  static async downloadIso(
    url: string, 
    targetPath: string, 
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    
    return new Promise((resolve) => {
      // Use wget with progress reporting
      // --show-progress: display the progress bar
      // --progress=dot:giga: output progress in a format we can parse
      const wget = spawn('wget', [
        '--progress=dot',
        '-O', targetPath, 
        url
      ])

      wget.stderr.on('data', (data) => {
        const output = data.toString()
        // Simple regex to find percentage in wget dot output
        // Example: 1550K .......... .......... .......... .......... ..........  3% 20.3M 4m15s
        const match = output.match(/(\d+)%/)
        if (match && onProgress) {
          onProgress(parseInt(match[1]))
        }
      })

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
