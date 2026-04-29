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
    const timeout = options.timeoutMs || 900000 // 15 minutes default
    
    try {
      await options.onLog('Initializing QEMU test environment...')
      
      const args = [
        '-nographic',
        '-m', '4096',
        '-smp', '2',
        '-netdev', 'user,id=net0',
        '-device', 'virtio-net-pci,netdev=net0',
        '-monitor', 'none'
      ]

      // Check for UEFI firmware
      const ovmfPath = '/usr/share/ovmf/OVMF.fd'
      let useUefi = false
      try {
        await fs.access(ovmfPath)
        args.push('-bios', ovmfPath)
        useUefi = true
        await options.onLog('UEFI firmware (OVMF) detected and enabled.\n')
      } catch {
        await options.onLog('UEFI firmware not found, falling back to BIOS.\n')
      }

      if (options.imageType === 'ISO') {
        // 1. Create a small temporary disk for the installer to see
        await execAsync(`qemu-img create -f qcow2 "${diskPath}" 10G`)
        args.push(
          '-drive', `file=${options.imagePath},format=raw,media=cdrom,readonly=on`,
          '-drive', `file=${diskPath},format=qcow2`,
          '-boot', 'once=d,menu=on'
        )
      } else {
        // Cloud Image: boot directly from the image
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

      const qemu = spawn('/usr/bin/qemu-system-x86_64', args)

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

          // Strip ANSI escape codes for cleaner matching
          const cleanOutput = output.replace(/\x1B\[[0-9;]*[JKmsu]/g, '')

          // Look for success indicators in the serial output
          const isFinished = 
            // Final success indicators
            cleanOutput.includes('login:') || 
            cleanOutput.includes('Welcome to Ubuntu') || 
            (cleanOutput.includes('Cloud-init') && cleanOutput.includes('finished')) ||
            cleanOutput.includes('subiquity/Success/SUCCESS') ||
            cleanOutput.includes('Installation complete!') ||
            cleanOutput.includes('REBOOTING') ||
            // Early "Bootable" indicators
            cleanOutput.includes('Using CD-ROM mount point') ||
            cleanOutput.includes('Scanning disc for index files') ||
            cleanOutput.includes('Linux version') ||
            (cleanOutput.includes('cloud-init') && cleanOutput.includes('modules:config'))

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
