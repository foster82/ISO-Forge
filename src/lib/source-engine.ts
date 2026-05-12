export interface SourcedImage {
  name: string
  version: string
  arch: 'amd64' | 'arm64'
  url: string
  filename: string
  imageType: 'ISO' | 'CLOUD_IMAGE'
  os: 'Ubuntu' | 'Debian' | 'Fedora' | 'Alpine' | 'Rocky' | 'Alma'
}

interface UbuntuProduct {
  versions: Record<string, {
    items: Record<string, {
      path: string
      size: number
      sha256: string
    }>
  }>
}

interface UbuntuStream {
  products: Record<string, UbuntuProduct>
}

export class SourceEngine {
  private static UBUNTU_RELEASES_URL = 'https://releases.ubuntu.com/'
  private static UBUNTU_CLOUD_URL = 'https://cloud-images.ubuntu.com/releases/'
  
  static async getUbuntuImages(type: 'ISO' | 'CLOUD_IMAGE'): Promise<SourcedImage[]> {
    try {
      if (type === 'ISO') {
        const response = await fetch('https://releases.ubuntu.com/streams/v1/com.ubuntu.releases:ubuntu-server.json', { signal: AbortSignal.timeout(5000) })
        const data = await response.json() as any
        const images: SourcedImage[] = []

        for (const [productId, product] of Object.entries(data.products) as [string, any][]) {
          const arch = productId.includes('arm64') ? 'arm64' : (productId.includes('amd64') ? 'amd64' : null)
          if (!arch) continue
          
          // Get the latest version key (e.g. 24.04.1)
          const versionKeys = Object.keys(product.versions).sort()
          const versionKey = versionKeys[versionKeys.length - 1]
          if (!versionKey) continue

          const versionData = product.versions[versionKey]
          const item = versionData.items['iso']

          if (item) {
            images.push({
              name: `Ubuntu Server ${product.version} (${arch})`,
              version: product.version,
              arch,
              url: this.UBUNTU_RELEASES_URL + item.path,
              filename: item.path.split('/').pop() || '',
              imageType: 'ISO',
              os: 'Ubuntu'
            })
          }
        }
        
        if (images.length === 0) throw new Error('No Ubuntu ISO images found in stream')
        return images.sort((a, b) => b.version.localeCompare(a.version))
      } else {
        const response = await fetch('https://cloud-images.ubuntu.com/releases/streams/v1/com.ubuntu.cloud:released:download.json', { signal: AbortSignal.timeout(5000) })
        const data = await response.json() as any
        const images: SourcedImage[] = []

        for (const [productId, product] of Object.entries(data.products) as [string, any][]) {
          const arch = productId.includes('arm64') ? 'arm64' : (productId.includes('amd64') ? 'amd64' : null)
          // We only want server images and specific arches
          if (!arch || !productId.includes(':server:')) continue
          
          const versionKeys = Object.keys(product.versions).sort()
          const versionKey = versionKeys[versionKeys.length - 1]
          if (!versionKey) continue

          const versionData = product.versions[versionKey]
          // Prefer disk1.img (standard) or disk.img
          const item = versionData.items['disk1.img'] || versionData.items['disk.img']

          if (item) {
            images.push({
              name: `Ubuntu Cloud ${product.version} (${arch})`,
              version: product.version,
              arch,
              url: this.UBUNTU_CLOUD_URL + item.path,
              filename: item.path.split('/').pop() || '',
              imageType: 'CLOUD_IMAGE',
              os: 'Ubuntu'
            })
          }
        }
        
        if (images.length === 0) throw new Error('No Ubuntu Cloud images found in stream')
        return images.sort((a, b) => b.version.localeCompare(a.version))
      }
    } catch (error) {
      console.error('Failed to fetch Ubuntu images, using fallbacks:', error)
      // Fallbacks if fetch fails
      if (type === 'ISO') {
        return [
          {
            name: 'Ubuntu Server 24.04.1 LTS (amd64)',
            version: '24.04.1',
            arch: 'amd64',
            url: 'https://releases.ubuntu.com/24.04/ubuntu-24.04.1-live-server-amd64.iso',
            filename: 'ubuntu-24.04.1-live-server-amd64.iso',
            imageType: 'ISO',
            os: 'Ubuntu'
          },
          {
            name: 'Ubuntu Server 22.04.5 LTS (amd64)',
            version: '22.04.5',
            arch: 'amd64',
            url: 'https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso',
            filename: 'ubuntu-22.04.5-live-server-amd64.iso',
            imageType: 'ISO',
            os: 'Ubuntu'
          }
        ]
      } else {
        return [
          {
            name: 'Ubuntu Cloud 24.04 LTS (amd64)',
            version: '24.04',
            arch: 'amd64',
            url: 'https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.img',
            filename: 'ubuntu-24.04-server-cloudimg-amd64.img',
            imageType: 'CLOUD_IMAGE',
            os: 'Ubuntu'
          }
        ]
      }
    }
  }

  static async getDebianImages(type: 'ISO' | 'CLOUD_IMAGE'): Promise<SourcedImage[]> {
    if (type === 'ISO') {
      return [
        {
          name: 'Debian 12 Stable (amd64)',
          version: '12',
          arch: 'amd64',
          url: 'https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.9.0-amd64-netinst.iso',
          filename: 'debian-12.9.0-amd64-netinst.iso',
          imageType: 'ISO',
          os: 'Debian'
        },
        {
          name: 'Debian 12 Stable (arm64)',
          version: '12',
          arch: 'arm64',
          url: 'https://cdimage.debian.org/debian-cd/current/arm64/iso-cd/debian-12.9.0-arm64-netinst.iso',
          filename: 'debian-12.9.0-arm64-netinst.iso',
          imageType: 'ISO',
          os: 'Debian'
        }
      ]
    } else {
      return [
        {
          name: 'Debian 12 Cloud Image (amd64)',
          version: '12',
          arch: 'amd64',
          url: 'https://cloud.debian.org/images/cloud/bookworm/latest/debian-12-generic-amd64.qcow2',
          filename: 'debian-12-generic-amd64.qcow2',
          imageType: 'CLOUD_IMAGE',
          os: 'Debian'
        },
        {
          name: 'Debian 12 Cloud Image (arm64)',
          version: '12',
          arch: 'arm64',
          url: 'https://cloud.debian.org/images/cloud/bookworm/latest/debian-12-generic-arm64.qcow2',
          filename: 'debian-12-generic-arm64.qcow2',
          imageType: 'CLOUD_IMAGE',
          os: 'Debian'
        }
      ]
    }
  }

  static async getFedoraImages(type: 'ISO' | 'CLOUD_IMAGE'): Promise<SourcedImage[]> {
    const v = '41'
    if (type === 'ISO') {
      return [
        {
          name: `Fedora Server ${v} (amd64)`,
          version: v,
          arch: 'amd64',
          url: `https://download.fedoraproject.org/pub/fedora/linux/releases/${v}/Server/x86_64/iso/Fedora-Server-dvd-x86_64-${v}-1.4.iso`,
          filename: `Fedora-Server-dvd-x86_64-${v}-1.4.iso`,
          imageType: 'ISO',
          os: 'Fedora'
        }
      ]
    } else {
      return [
        {
          name: `Fedora Cloud Base ${v} (amd64)`,
          version: v,
          arch: 'amd64',
          url: `https://download.fedoraproject.org/pub/fedora/linux/releases/${v}/Cloud/x86_64/images/Fedora-Cloud-Base-Generic-41-1.4.x86_64.qcow2`,
          filename: `Fedora-Cloud-Base-Generic-${v}-1.4.x86_64.qcow2`,
          imageType: 'CLOUD_IMAGE',
          os: 'Fedora'
        }
      ]
    }
  }

  static async getAlpineImages(type: 'ISO' | 'CLOUD_IMAGE'): Promise<SourcedImage[]> {
    const v = '3.21.2'
    const shortV = '3.21'
    if (type === 'ISO') {
      return [
        {
          name: `Alpine Linux ${v} Standard (amd64)`,
          version: v,
          arch: 'amd64',
          url: `https://dl-cdn.alpinelinux.org/alpine/v${shortV}/releases/x86_64/alpine-standard-${v}-x86_64.iso`,
          filename: `alpine-standard-${v}-x86_64.iso`,
          imageType: 'ISO',
          os: 'Alpine'
        }
      ]
    } else {
      return [
        {
          name: `Alpine Linux ${v} Cloud (amd64)`,
          version: v,
          arch: 'amd64',
          url: `https://dl-cdn.alpinelinux.org/alpine/v${shortV}/releases/x86_64/alpine-cloud-${v}-x86_64.qcow2`,
          filename: `alpine-cloud-${v}-x86_64.qcow2`,
          imageType: 'CLOUD_IMAGE',
          os: 'Alpine'
        }
      ]
    }
  }

  static async getRockyImages(type: 'ISO' | 'CLOUD_IMAGE'): Promise<SourcedImage[]> {
    const v = '9.5'
    if (type === 'ISO') {
      return [
        {
          name: `Rocky Linux ${v} Minimal (amd64)`,
          version: v,
          arch: 'amd64',
          url: `https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9.5-x86_64-minimal.iso`,
          filename: `Rocky-9.5-x86_64-minimal.iso`,
          imageType: 'ISO',
          os: 'Rocky'
        }
      ]
    } else {
      return [
        {
          name: `Rocky Linux ${v} Cloud (amd64)`,
          version: v,
          arch: 'amd64',
          url: `https://download.rockylinux.org/pub/rocky/9/images/x86_64/Rocky-9-GenericCloud-Base-9.5-20241118.0.x86_64.qcow2`,
          filename: `Rocky-9-GenericCloud-Base-9.5.qcow2`,
          imageType: 'CLOUD_IMAGE',
          os: 'Rocky'
        }
      ]
    }
  }

  static async getAlmaImages(type: 'ISO' | 'CLOUD_IMAGE'): Promise<SourcedImage[]> {
    const v = '9.5'
    if (type === 'ISO') {
      return [
        {
          name: `AlmaLinux ${v} Minimal (amd64)`,
          version: v,
          arch: 'amd64',
          url: `https://repo.almalinux.org/almalinux/9/isos/x86_64/AlmaLinux-9.5-x86_64-minimal.iso`,
          filename: `AlmaLinux-9.5-x86_64-minimal.iso`,
          imageType: 'ISO',
          os: 'Alma'
        }
      ]
    } else {
      return [
        {
          name: `AlmaLinux ${v} Cloud (amd64)`,
          version: v,
          arch: 'amd64',
          url: `https://repo.almalinux.org/almalinux/9/cloud/x86_64/images/AlmaLinux-9-GenericCloud-9.5-20241120.x86_64.qcow2`,
          filename: `AlmaLinux-9-GenericCloud-9.5.qcow2`,
          imageType: 'CLOUD_IMAGE',
          os: 'Alma'
        }
      ]
    }
  }

  static async getAllImages(type: 'ISO' | 'CLOUD_IMAGE'): Promise<SourcedImage[]> {
    const [ubuntu, debian, fedora, alpine, rocky, alma] = await Promise.all([
      this.getUbuntuImages(type),
      this.getDebianImages(type),
      this.getFedoraImages(type),
      this.getAlpineImages(type),
      this.getRockyImages(type),
      this.getAlmaImages(type)
    ])
    return [...ubuntu, ...debian, ...fedora, ...alpine, ...rocky, ...alma]
  }

  static async findBestMatch(baseImage: { name: string, arch: string, imageType: string }): Promise<SourcedImage | null> {
    const sourced = await this.getAllImages(baseImage.imageType as any)
    
    // Simple heuristic: matching name (partial) and exact arch
    // e.g. "Ubuntu 24.04" in "Ubuntu Server 24.04.1 (amd64)"
    const match = sourced.find(s => 
      baseImage.name.toLowerCase().includes(s.os.toLowerCase()) && 
      s.arch === baseImage.arch
    )
    
    return match || null
  }
}
