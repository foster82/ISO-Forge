import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export interface BuildOptions {
  baseIsoPath: string
  imageType: 'ISO' | 'CLOUD_IMAGE'
  outputPath: string
  hostname: string
  username: string
  passwordHash: string
  sshKey?: string
  packages: string[]
  configYaml?: string
  ipAddress?: string
  gateway?: string
  dnsServers?: string[]
  onLog: (message: string) => void
}

export class BuildEngine {
  private static async runCommand(cmd: string, args: string[], options: BuildOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      options.onLog(`Executing: ${cmd} ${args.map(a => `"${a}"`).join(' ')}`)
      const proc = spawn(cmd, args)

      proc.stdout.on('data', (data) => options.onLog(data.toString()))
      proc.stderr.on('data', (data) => options.onLog(`[STDERR] ${data.toString()}`))

      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`Command failed with code ${code}: ${cmd}`))
      })

      proc.on('error', (err) => reject(err))
    })
  }

  static async createCustomImage(options: BuildOptions) {
    if (options.imageType === 'ISO') {
      return this.createCustomIso(options)
    } else {
      return this.createCloudImage(options)
    }
  }

  private static async createCloudImage(options: BuildOptions) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cloud-forge-'))
    
    try {
      // Check for virt-customize availability
      try {
        await execAsync('virt-customize --version')
      } catch {
        throw new Error('virt-customize tool not found. Please install libguestfs-tools on the host system.')
      }

      options.onLog(`Starting Cloud Image build in temporary directory: ${tempDir}`)
      
      // 1. Copy base image to output path
      options.onLog('Copying base cloud image...')
      await fs.copyFile(options.baseIsoPath, options.outputPath)

      // 2. Prepare cloud-init configurations
      options.onLog('Preparing cloud-init configurations...')
      const userData = this.generateUserData(options)
      const metaData = '# cloud-config'
      
      const userDataPath = path.join(tempDir, 'user-data')
      const metaDataPath = path.join(tempDir, 'meta-data')
      
      await fs.writeFile(userDataPath, userData)
      await fs.writeFile(metaDataPath, metaData)

      // 3. Inject files using virt-customize
      options.onLog('Injecting cloud-init data into image via virt-customize...')
      // We inject into /var/lib/cloud/seed/nocloud-net/ which is a standard location
      const args = [
        '-a', options.outputPath,
        '--mkdir', '/var/lib/cloud/seed/nocloud-net',
        '--copy-in', `${userDataPath}:/var/lib/cloud/seed/nocloud-net`,
        '--copy-in', `${metaDataPath}:/var/lib/cloud/seed/nocloud-net`,
        '--run-command', 'chmod 600 /var/lib/cloud/seed/nocloud-net/*'
      ]
      
      await this.runCommand('/usr/bin/virt-customize', args, options)

      options.onLog('Cloud Image build completed successfully.')
      options.onLog('\n' + '='.repeat(50))
      options.onLog('BUILD SUCCESSFUL')
      options.onLog(`Output: ${options.outputPath}`)
      options.onLog('='.repeat(50) + '\n')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      options.onLog(`Cloud Image build failed: ${errorMessage}`)
      throw error
    } finally {
      options.onLog('Cleaning up temporary files...')
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  }

  private static async createCustomIso(options: BuildOptions) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'iso-forge-'))
    const sourceDir = path.join(tempDir, 'source')
    
    try {
      options.onLog(`Starting ISO build in temporary directory: ${tempDir}`)
      await fs.mkdir(sourceDir)

      // 1. Extract ISO
      options.onLog('Extracting base ISO...')
      await this.runCommand('/usr/bin/7z', ['x', options.baseIsoPath, `-o${sourceDir}`], options)

      // 2. Prepare nocloud directory
      options.onLog('Preparing cloud-init configurations...')
      const nocloudDir = path.join(sourceDir, 'nocloud')
      await fs.mkdir(nocloudDir)
      
      await fs.writeFile(path.join(nocloudDir, 'meta-data'), '')
      
      const userData = this.generateUserData(options)
      await fs.writeFile(path.join(nocloudDir, 'user-data'), userData)

      // 3. Modify GRUB config
      options.onLog('Modifying bootloader configuration...')
      const grubPath = path.join(sourceDir, 'boot', 'grub', 'grub.cfg')
      let grubContent = await fs.readFile(grubPath, 'utf-8')
      
      // Set a short timeout for automated testing (global replace)
      grubContent = grubContent.replace(/set\s+timeout=\d+/g, 'set timeout=1')
      
      // Force GRUB to use serial console for visibility
      const serialGrubConfig = `
serial --unit=0 --speed=115200 --word=8 --parity=no --stop=1
terminal_input --append serial
terminal_output --append serial
`
      grubContent = serialGrubConfig + grubContent

      // Inject autoinstall parameters and serial console
      const kernelRegex = /linux\s+\/casper\/vmlinuz.*---/
      if (kernelRegex.test(grubContent)) {
        // Use single console to avoid device conflicts
        // Escaping semicolon for GRUB
        const params = 'autoinstall "ds=nocloud\\;s=/cdrom/nocloud/" console=ttyS0,115200n8'
        grubContent = grubContent.replace(
          kernelRegex,
          `linux /casper/vmlinuz ${params} ---`
        )
        options.onLog('Successfully injected autoinstall parameters into grub.cfg')
        options.onLog('Modified GRUB line: ' + grubContent.match(/linux.*/)?.[0])
      } else {
        options.onLog('Warning: Could not find kernel line in grub.cfg to inject parameters')
      }
      
      await fs.writeFile(grubPath, grubContent)

      // 4. Repack ISO
      options.onLog('Repacking customized ISO...')
      // Using stdio: prefix and -overwrite on for reliability
      await this.runCommand('/usr/bin/xorriso', [
        '-indev', `stdio:${options.baseIsoPath}`,
        '-outdev', `stdio:${options.outputPath}`,
        '-overwrite', 'on',
        '-map', `${sourceDir}/nocloud`, '/nocloud',
        '-map', `${sourceDir}/boot/grub/grub.cfg`, '/boot/grub/grub.cfg',
        '-boot_image', 'any', 'replay'
      ], options)

      options.onLog('ISO build completed successfully.')
      options.onLog('\n' + '='.repeat(50))
      options.onLog('BUILD SUCCESSFUL')
      options.onLog(`Output: ${options.outputPath}`)
      options.onLog('='.repeat(50) + '\n')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      options.onLog(`ISO build failed: ${errorMessage}`)
      throw error
    } finally {
      options.onLog('Cleaning up temporary files...')
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  }

  private static generateUserData(options: BuildOptions): string {
    const packagesStr = options.packages.length > 0 
      ? `\n    packages:\n${options.packages.map(p => `      - ${p}`).join('\n')}`
      : ''
    
    const sshKeyStr = options.sshKey 
      ? `\n    ssh_authorized_keys:\n      - ${options.sshKey}`
      : ''

    const customYamlStr = options.configYaml 
      ? `\n# Custom Configuration Overrides\n${options.configYaml}`
      : ''

    let networkStr = ''
    if (options.ipAddress) {
      const dnsStr = options.dnsServers && options.dnsServers.length > 0
        ? `\n          nameservers:\n            addresses: [${options.dnsServers.join(', ')}]`
        : ''
      
      const gatewayStr = options.gateway
        ? `\n          gateway4: ${options.gateway}\n          routes:\n            - to: default\n              via: ${options.gateway}`
        : ''

      networkStr = `
  network:
    network:
      version: 2
      ethernets:
        default-interface:
          match:
            name: "e*"
          addresses:
            - ${options.ipAddress}${gatewayStr}${dnsStr}`
    }

    return `#cloud-config
autoinstall:
  version: 1
  identity:
    hostname: ${options.hostname}
    password: "${options.passwordHash}"
    username: ${options.username}
  ssh:
    install-server: true
    allow-pw: true
  user-data:
    users:
      - name: ${options.username}
        groups: [sudo]
        shell: /bin/bash${sshKeyStr}
  storage:
    layout:
      name: direct
  reboot: true${networkStr}
${packagesStr}${customYamlStr}
`
  }
}
