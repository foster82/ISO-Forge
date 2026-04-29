import { exec } from 'child_process'
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
  onLog: (message: string) => void
}

export class BuildEngine {
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
      const cmd = `virt-customize -a "${options.outputPath}" \
        --mkdir /var/lib/cloud/seed/nocloud-net \
        --copy-in "${userDataPath}":/var/lib/cloud/seed/nocloud-net \
        --copy-in "${metaDataPath}":/var/lib/cloud/seed/nocloud-net \
        --run-command "chmod 600 /var/lib/cloud/seed/nocloud-net/*"`
      
      await execAsync(cmd)

      options.onLog('Cloud Image build completed successfully.')
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
      await execAsync(`7z x "${options.baseIsoPath}" -o"${sourceDir}"`)

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
      
      // Inject autoinstall parameters and serial console
      const kernelRegex = /linux\s+\/casper\/vmlinuz.*---/
      if (kernelRegex.test(grubContent)) {
        // Use single console to avoid device conflicts
        const params = 'autoinstall ds=nocloud\\;s=/cdrom/nocloud/ console=ttyS0,115200n8'
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
      // Reverting to native xorriso command which supports -indev and replay
      await execAsync(`xorriso -indev "${options.baseIsoPath}" -outdev "${options.outputPath}" -map "${sourceDir}/nocloud" /nocloud -map "${sourceDir}/boot/grub/grub.cfg" /boot/grub/grub.cfg -boot_image any replay`)

      options.onLog('ISO build completed successfully.')
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
  reboot: true
${packagesStr}${customYamlStr}
`
  }
}
