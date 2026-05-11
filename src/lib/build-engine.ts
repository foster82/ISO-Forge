import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export interface BuildOptions {
  baseIsoPath: string
  imageType: 'ISO' | 'CLOUD_IMAGE'
  arch?: string // 'amd64' or 'arm64'
  outputPath: string
  hostname: string
  username: string
  passwordHash: string
  sshKey?: string
  packages: string[]
  timezone?: string
  locale?: string
  runcmd?: string[]
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
      if (!grubContent.includes('terminal_input --append serial')) {
        grubContent = serialGrubConfig + grubContent
      }

      // Inject autoinstall parameters and serial console
      // Match all linux kernel lines
      const linuxLineRegex = /^\s*linux\s+\/casper\/vmlinuz.*/gm
      if (linuxLineRegex.test(grubContent)) {
        options.onLog('Found linux kernel lines in grub.cfg. Injecting parameters...')
        grubContent = grubContent.replace(linuxLineRegex, (line) => {
          // If already has autoinstall, don't double up
          if (line.includes('autoinstall')) return line;
          
          // Remove existing '---' and anything after it to append our params before it
          let newLine = line.replace(/\s+---.*/, '').trim();
          
          // Remove quiet/splash to see more logs
          newLine = newLine.replace(/\s+quiet/g, '').replace(/\s+splash/g, '');
          
          // Add our params and a fresh '---'
          // We use ds=nocloud;s=/cdrom/nocloud/ (with backslash for GRUB)
          return `${newLine} autoinstall "ds=nocloud\\;s=/cdrom/nocloud/" console=ttyS0,115200n8 ---`
        });
        
        const modifiedLines = grubContent.match(linuxLineRegex);
        if (modifiedLines) {
          options.onLog('Modified GRUB lines:')
          modifiedLines.forEach(l => options.onLog('  ' + l.trim()))
        }
      } else {
        options.onLog('Warning: Could not find any kernel lines (linux /casper/vmlinuz) in grub.cfg')
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

  static generateUserData(options: BuildOptions): string {
    const isIso = options.imageType === 'ISO'
    
    const timezone = options.timezone || 'UTC'
    const locale = options.locale || 'en_US.UTF-8'
    
    // Common components
    const packagesArr = options.packages.length > 0 ? options.packages : []
    const runcmdArr = options.runcmd && options.runcmd.length > 0 ? options.runcmd : []
    const sshKeys = options.sshKey ? [options.sshKey] : []

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

    if (isIso) {
      // Ubuntu Autoinstall Format (for ISOs)
      const packagesStr = packagesArr.length > 0 
        ? `\n    packages:\n${packagesArr.map(p => `      - ${p}`).join('\n')}`
        : ''
      
      const sshKeyStr = sshKeys.length > 0 
        ? `\n    ssh_authorized_keys:\n${sshKeys.map(k => `      - ${k}`).join('\n')}`
        : ''

      const runcmdStr = runcmdArr.length > 0
        ? `\n    runcmd:\n${runcmdArr.map(cmd => `      - ${cmd}`).join('\n')}`
        : ''

      const customYamlStr = options.configYaml 
        ? `\n# Custom Configuration Overrides\n${options.configYaml}`
        : ''

      return `#cloud-config
autoinstall:
  version: 1
  identity:
    hostname: ${options.hostname}
    password: "${options.passwordHash}"
    username: ${options.username}
  locale: ${locale}
  timezone: ${timezone}
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
${packagesStr}${runcmdStr}${customYamlStr}
`
    } else {
      // Standard cloud-config Format (for Cloud Images)
      const packagesStr = packagesArr.length > 0 
        ? `\npackages:\n${packagesArr.map(p => `  - ${p}`).join('\n')}`
        : ''
      
      const sshKeyStr = sshKeys.length > 0 
        ? `\n    ssh_authorized_keys:\n${sshKeys.map(k => `      - ${k}`).join('\n')}`
        : ''

      const runcmdStr = runcmdArr.length > 0
        ? `\nruncmd:\n${runcmdArr.map(cmd => `  - ${cmd}`).join('\n')}`
        : ''

      const customYamlStr = options.configYaml 
        ? `\n# Custom Configuration Overrides\n${options.configYaml}`
        : ''

      return `#cloud-config
hostname: ${options.hostname}
manage_etc_hosts: true
users:
  - name: ${options.username}
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: [sudo]
    shell: /bin/bash
    lock_passwd: false
    passwd: "${options.passwordHash}"${sshKeyStr}

locale: ${locale}
timezone: ${timezone}

ssh_pwauth: true
${packagesStr}${runcmdStr}${networkStr}${customYamlStr}
`
    }
  }
}
