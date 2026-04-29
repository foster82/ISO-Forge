import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export interface TestOptions {
  imagePath: string
  imageType: 'ISO' | 'CLOUD_IMAGE'
  onLog: (message: string) => Promise<void>
  timeoutMs?: number
}

export class QEMURunner {
  static async testBoot(options: TestOptions): Promise<boolean> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qemu-test-'))
    const diskPath = path.join(tempDir, 'test-disk.qcow2')
    const timeout = options.timeoutMs || 2700000 // 45 minutes default for non-KVM
    
    try {
      await options.onLog('Initializing QEMU test environment...')
      
      const args = [
        '-nographic',
        '-m', '4096',
        '-smp', '2',
        '-netdev', 'user,id=net0',
        '-device', 'virtio-net-pci,netdev=net0',
        '-nodefaults',
        '-serial', 'stdio'
      ]

      if (options.imageType === 'ISO') {
        // 1. Create a small temporary disk for the installer to see
        await execAsync(`qemu-img create -f qcow2 "${diskPath}" 10G`)
        args.push(
          '-cdrom', options.imagePath,
          '-drive', `file=${diskPath},format=qcow2`,
          '-boot', 'd'
        )
      } else {
        // Cloud Image: boot directly from the image
        // We use format=qcow2 but it might be raw, qemu usually detects it or we can check extension
        const format = options.imagePath.endsWith('.qcow2') ? 'qcow2' : 'raw'
        args.push(
          '-drive', `file=${options.imagePath},format=${format}`,
          '-boot', 'c'
        )
      }

      // Enable KVM if available for much faster tests
      try {
        await execAsync('test -e /dev/kvm')
        args.push('-enable-kvm', '-cpu', 'host')
        await options.onLog('KVM acceleration enabled.\n')
      } catch {
        args.push('-cpu', 'max') // Use 'max' for better emulation performance
        await options.onLog('KVM not available, running with software emulation (slower) using CPU "max".\n')
      }

      const qemu = spawn('qemu-system-x86_64', args)

      let isSuccess = false
      let output = ''

      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          qemu.kill('SIGKILL')
          options.onLog('\n[TIMEOUT] Boot test timed out after ' + (timeout / 1000) + 's')
          resolve(false)
        }, timeout)

        qemu.stdout.on('data', async (data) => {
          const chunk = data.toString()
          output += chunk
          await options.onLog(chunk)

          // Look for success indicators in the serial output
          const isFinished = 
            output.includes('login:') || 
            output.includes('Welcome to Ubuntu') || 
            (output.includes('Cloud-init') && output.includes('finished')) ||
            output.includes('subiquity/Success/SUCCESS') ||
            output.includes('Installation complete!') ||
            output.includes('REBOOTING')

          if (isFinished) {
            clearTimeout(timer)
            isSuccess = true
            qemu.kill('SIGKILL')
            await options.onLog('\n[SUCCESS] Boot indicator detected!')
            resolve(true)
          }
        })

        qemu.stderr.on('data', async (data) => {
          await options.onLog(`\n[QEMU ERROR] ${data.toString()}`)
        })

        qemu.on('close', () => {
          clearTimeout(timer)
          resolve(isSuccess)
        })

        qemu.on('error', (err) => {
          clearTimeout(timer)
          reject(err)
        })
      })

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await options.onLog(`\n[TEST FAILED] ${errorMessage}`)
      return false
    } finally {
      // Cleanup temp disk
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  }
}
