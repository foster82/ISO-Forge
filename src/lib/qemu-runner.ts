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
        '-machine', 'q35',
        '-netdev', 'user,id=net0',
        '-device', 'virtio-net-pci,netdev=net0',
        '-monitor', 'none',
        '-display', 'none',
        '-serial', 'stdio'
      ]

      // Check for UEFI firmware
      const ovmfPath = '/usr/share/ovmf/OVMF.fd'
      let hasUefi = false
      try {
        await fs.access(ovmfPath)
        hasUefi = true
      } catch {}

      if (options.imageType === 'ISO') {
        // ISOs usually boot fine with BIOS, but we can use UEFI if available
        if (hasUefi) {
          args.push('-bios', ovmfPath)
          await options.onLog('UEFI firmware (OVMF) enabled for ISO boot.\n')
        }

        await execAsync(`qemu-img create -f qcow2 "${diskPath}" 10G`)
        
        // Use if=none and -device for better control
        args.push(
          '-drive', `file=${options.imagePath},format=raw,if=none,id=cdrom,readonly=on`,
          '-device', 'virtio-blk-pci,drive=cdrom,bootindex=0',
          '-drive', `file=${diskPath},format=qcow2,if=none,id=hd0`,
          '-device', 'virtio-blk-pci,drive=hd0,bootindex=1'
        )
      } else {
        // Cloud Images: Many Ubuntu cloud images are hybrid, but let's try UEFI first if available
        // as modern GPT images often prefer it.
        if (hasUefi) {
          args.push('-bios', ovmfPath)
          await options.onLog('UEFI firmware (OVMF) enabled for Cloud Image boot.\n')
        }

        // Detect format more reliably
        let format = 'raw'
        try {
          const { stdout } = await execAsync(`qemu-img info "${options.imagePath}" --output=json`)
          const info = JSON.parse(stdout)
          format = info.format
          await options.onLog(`Detected image format: ${format}\n`)
        } catch {
          format = options.imagePath.endsWith('.qcow2') ? 'qcow2' : 'raw'
          await options.onLog(`Failed to detect format via qemu-img, falling back to extension-based: ${format}\n`)
        }

        args.push(
          '-drive', `file=${options.imagePath},format=${format},if=none,id=hd0`,
          '-device', 'virtio-blk-pci,drive=hd0,bootindex=0'
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
