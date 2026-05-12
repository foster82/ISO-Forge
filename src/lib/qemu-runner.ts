import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import net from 'net'

const execAsync = promisify(exec)

export interface TestOptions {
  jobId: string
  imagePath: string
  imageType: 'ISO' | 'CLOUD_IMAGE'
  arch?: string // 'amd64' or 'arm64'
  onLog: (message: string) => Promise<void>
  onScreenshot?: (screenshotPath: string) => Promise<void>
  timeoutMs?: number
  vncDisplay?: number // Display number for VNC (e.g. 1 means port 5901)
  sshConfig?: {
    user: string
    port?: number
  }
}

export class QEMURunner {
  private static async waitForPort(port: number, host: string = 'localhost', timeout: number = 300000): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      try {
        await new Promise((resolve, reject) => {
          const socket = new net.Socket()
          socket.setTimeout(2000)
          socket.on('connect', () => {
            socket.destroy()
            resolve(true)
          })
          socket.on('error', reject)
          socket.on('timeout', () => {
            socket.destroy()
            reject(new Error('timeout'))
          })
          socket.connect(port, host)
        })
        return true
      } catch {
        await new Promise(r => setTimeout(resolve => r(null), 2000))
      }
    }
    return false
  }

  static async testBoot(options: TestOptions): Promise<boolean> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qemu-test-'))
    const diskPath = path.join(tempDir, 'test-disk.qcow2')
    const monitorSocket = path.join(tempDir, 'qemu-monitor.sock')
    const timeout = options.timeoutMs || 900000 // 15 minutes default
    const arch = options.arch || 'amd64'
    const sshLocalPort = 2222 + (options.vncDisplay || 0)
    
    try {
      await options.onLog(`Initializing QEMU Smart Test environment for ${arch}...`)
      
      const qemuBinary = arch === 'arm64' ? '/usr/bin/qemu-system-aarch64' : '/usr/bin/qemu-system-x86_64'
      const machineType = arch === 'arm64' ? 'virt' : 'q35'

      const args = [
        '-m', '4096',
        '-smp', '2',
        '-machine', machineType,
        '-device', 'virtio-net-pci,netdev=net0',
        '-monitor', `unix:${monitorSocket},server,nowait`,
        '-serial', 'stdio'
      ]

      // Network with port forwarding for SSH test
      args.push('-netdev', `user,id=net0,hostfwd=tcp::${sshLocalPort}-:22`)

      if (options.vncDisplay !== undefined) {
        args.push('-vnc', `:${options.vncDisplay}`)
        await options.onLog(`VNC Enabled on display :${options.vncDisplay} (Port ${5900 + options.vncDisplay})\n`)
      } else {
        args.push('-nographic', '-display', 'none')
      }

      if (arch === 'arm64') {
        const aavmfPath = '/usr/share/AAVMF/AAVMF_CODE.fd'
        try {
          await fs.access(aavmfPath)
          args.push('-drive', `if=pflash,format=raw,unit=0,file=${aavmfPath},readonly=on`)
          await options.onLog('ARM64 UEFI firmware (AAVMF) enabled.\n')
        } catch {
          await options.onLog('WARNING: AAVMF firmware not found. ARM64 boot may fail.\n')
        }
      } else {
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
        let format = 'raw'
        try {
          const { stdout } = await execAsync(`qemu-img info "${options.imagePath}" --output=json`)
          const info = JSON.parse(stdout)
          format = info.format
        } catch {
          format = options.imagePath.endsWith('.qcow2') ? 'qcow2' : 'raw'
        }
        args.push(
          '-drive', `file=${options.imagePath},format=${format},if=none,id=hd0`,
          '-device', 'virtio-blk-pci,drive=hd0,bootindex=0'
        )
      }

      // KVM check
      try {
        await execAsync('test -e /dev/kvm')
        const hostArch = os.arch() === 'x64' ? 'amd64' : (os.arch() === 'arm64' ? 'arm64' : os.arch())
        if (hostArch === arch) {
          args.push('-enable-kvm', '-cpu', 'host')
          await options.onLog('KVM acceleration enabled.\n')
        } else {
          args.push('-cpu', 'max')
        }
      } catch {
        args.push('-cpu', 'max') 
      }

      await options.onLog(`Starting QEMU process...\n`)
      const qemu = spawn(qemuBinary, args)

      let isSuccess = false
      let sshDetected = false
      let screenshotTaken = false
      let output = ''

      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          qemu.kill('SIGKILL')
          options.onLog('\n[TIMEOUT] Boot test timed out after ' + (timeout / 1000) + 's')
          resolve(false)
        }, timeout)

        const takeScreenshot = async () => {
          if (screenshotTaken) return
          screenshotTaken = true
          try {
            const screenshotDir = path.join(process.cwd(), 'public', 'storage', 'screenshots')
            await fs.mkdir(screenshotDir, { recursive: true })
            const screenshotName = `boot-${options.jobId}-${Date.now()}.png`
            const screenshotPath = path.join(screenshotDir, screenshotName)
            
            // QEMU monitor command for screenshot
            // We use socat or a small node script to send to the unix socket
            // For simplicity in this env, we'll try to use a quick exec
            await options.onLog(`\n[SMART-TEST] Capturing VNC screenshot...`)
            await execAsync(`echo "screendump ${screenshotPath}" | socat - UNIX-CONNECT:${monitorSocket}`)
            
            if (options.onScreenshot) {
              await options.onScreenshot(`/storage/screenshots/${screenshotName}`)
            }
            await options.onLog(` Success.\n`)
          } catch (e) {
            await options.onLog(` Failed: ${String(e)}\n`)
          }
        }

        // Background SSH poller
        const checkSsh = async () => {
          const detected = await this.waitForPort(sshLocalPort, 'localhost', timeout - 60000)
          if (detected) {
            sshDetected = true
            await options.onLog(`\n[SMART-TEST] SSH port 22 detected on localhost:${sshLocalPort}!\n`)
            // If we have SSH, it's a very high quality success
            await takeScreenshot()
            isSuccess = true
            qemu.kill('SIGTERM')
          }
        }
        checkSsh()

        qemu.stdout.on('data', async (data) => {
          const chunk = data.toString()
          output += chunk
          await options.onLog(chunk)

          const cleanOutput = output.replace(/\x1B\[[0-9;]*[JKmsu]/g, '')
          
          // Legacy success check
          if (cleanOutput.includes('login:') || cleanOutput.includes('subiquity/Success/SUCCESS')) {
            await options.onLog(`\n[SMART-TEST] Login prompt detected via serial.\n`)
            await takeScreenshot()
            isSuccess = true
            // Don't kill immediately if we're still waiting for SSH, 
            // but if SSH is not configured or already found, we can wrap up.
            if (!options.sshConfig || sshDetected) {
              qemu.kill('SIGTERM')
            }
          }
        })

        qemu.stderr.on('data', async (data) => {
          const msg = data.toString()
          if (!msg.includes('warning: TCG doesn\'t support requested feature')) {
            await options.onLog(`\n[QEMU ERROR] ${msg}`)
          }
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
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  }
}
