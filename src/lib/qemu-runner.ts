import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export interface TestOptions {
  imagePath: string
  imageType: 'ISO' | 'CLOUD_IMAGE'
  arch?: string // 'amd64' or 'arm64'
  onLog: (message: string) => Promise<void>
  timeoutMs?: number
  vncDisplay?: number // Display number for VNC (e.g. 1 means port 5901)
}

export class QEMURunner {
  static async testBoot(options: TestOptions): Promise<boolean> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qemu-test-'))
    const diskPath = path.join(tempDir, 'test-disk.qcow2')
    const timeout = options.timeoutMs || 900000 // 15 minutes default
    const arch = options.arch || 'amd64'
    
    try {
      await options.onLog(`Initializing QEMU test environment for ${arch}...`)
      
      const qemuBinary = arch === 'arm64' ? '/usr/bin/qemu-system-aarch64' : '/usr/bin/qemu-system-x86_64'
      const machineType = arch === 'arm64' ? 'virt' : 'q35'

      const args = [
        '-m', '4096',
        '-smp', '2',
        '-machine', machineType,
        '-netdev', 'user,id=net0',
        '-device', 'virtio-net-pci,netdev=net0',
        '-monitor', 'none',
        '-serial', 'stdio'
      ]

      if (options.vncDisplay !== undefined) {
        args.push('-vnc', `:${options.vncDisplay}`)
        await options.onLog(`VNC Enabled on display :${options.vncDisplay} (Port ${5900 + options.vncDisplay})\n`)
      } else {
        args.push('-nographic', '-display', 'none')
      }

      if (arch === 'arm64') {
        // arm64/virt needs highmem off sometimes for older kernels, but let's try default
        // It also MUST use UEFI (AAVMF)
        const aavmfPath = '/usr/share/AAVMF/AAVMF_CODE.fd'
        
        try {
          await fs.access(aavmfPath)
          args.push('-drive', `if=pflash,format=raw,unit=0,file=${aavmfPath},readonly=on`)
          // We don't necessarily need vars for a simple boot test, but it's good practice
          await options.onLog('ARM64 UEFI firmware (AAVMF) enabled.\n')
        } catch {
          await options.onLog('WARNING: AAVMF firmware not found. ARM64 boot may fail. Please install qemu-efi-aarch64.\n')
        }
      } else {
        // Check for UEFI firmware (x86)
        const ovmfPath = '/usr/share/ovmf/OVMF.fd'
        let hasUefi = false
        try {
          await fs.access(ovmfPath)
          hasUefi = true
        } catch {}

        if (hasUefi) {
          args.push('-bios', ovmfPath)
          await options.onLog('UEFI firmware (OVMF) enabled.\n')
        }
      }

      if (options.imageType === 'ISO') {
        await execAsync(`qemu-img create -f qcow2 "${diskPath}" 10G`)
        
        if (arch === 'arm64') {
          args.push(
            '-device', 'virtio-blk-pci,drive=drive0,id=virtblk0',
            '-drive', `file=${diskPath},format=qcow2,if=none,id=drive0`,
            '-device', 'virtio-scsi-pci,id=scsi0',
            '-device', 'scsi-cd,drive=drive1,id=virtcd0',
            '-drive', `file=${options.imagePath},media=cdrom,readonly=on,if=none,id=drive1`
          )
        } else {
          args.push(
            '-drive', `file=${options.imagePath},media=cdrom,readonly=on,index=0`,
            '-drive', `file=${diskPath},format=qcow2,if=virtio,index=1`
          )
        }
      } else {
        // Cloud Images
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

      // Enable KVM if available
      try {
        await execAsync('test -e /dev/kvm')
        // Only use KVM if host arch matches guest arch
        const hostArch = os.arch() === 'x64' ? 'amd64' : (os.arch() === 'arm64' ? 'arm64' : os.arch())
        if (hostArch === arch) {
          args.push('-enable-kvm', '-cpu', 'host')
          await options.onLog('KVM acceleration enabled.\n')
        } else {
          args.push('-cpu', 'max')
          await options.onLog(`KVM not available for cross-arch (Host: ${hostArch}, Guest: ${arch}). Using software emulation.\n`)
        }
      } catch {
        args.push('-cpu', 'max') 
        await options.onLog('KVM not available, running with software emulation.\n')
      }

      await options.onLog(`Starting QEMU process: ${qemuBinary} ${args.join(' ')}\n`)
      const qemu = spawn(qemuBinary, args)

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
            cleanOutput.includes('Welcome to Alpine Linux') ||
            cleanOutput.includes('Fedora') ||
            cleanOutput.includes('Rocky Linux') ||
            cleanOutput.includes('AlmaLinux') ||
            (cleanOutput.includes('Cloud-init') && cleanOutput.includes('finished')) ||
            cleanOutput.includes('subiquity/Success/SUCCESS') ||
            cleanOutput.includes('Installation complete!') ||
            cleanOutput.includes('REBOOTING') ||
            // Early "Bootable" indicators (helpful if full install takes too long)
            cleanOutput.includes('Using CD-ROM mount point') ||
            cleanOutput.includes('Scanning disc for index files') ||
            cleanOutput.includes('Linux version') ||
            cleanOutput.includes('Kernel command line') ||
            (cleanOutput.includes('cloud-init') && cleanOutput.includes('modules:config')) ||
            cleanOutput.includes('Begin: Loading essential drivers')

          if (isFinished) {
            clearTimeout(timer)
            isSuccess = true
            qemu.kill('SIGKILL')
            await options.onLog('\n[SUCCESS] Boot indicator detected! ' + (cleanOutput.includes('login:') ? '(Reached login prompt)' : '(Reached kernel/installer stage)'))
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
