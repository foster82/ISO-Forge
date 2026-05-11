import fs from 'fs'

export interface OpenStackConfig {
  authUrl: string
  username: string
  password: string
  projectName: string
  domainName?: string
  region?: string
}

export interface OpenStackImageMetadata {
  name: string
  diskFormat: 'qcow2' | 'iso' | 'raw'
  containerFormat: 'bare'
  visibility: 'private' | 'public' | 'shared' | 'community'
}

interface KeystoneEndpoint {
  interface: string
  region: string
  url: string
}

interface KeystoneService {
  type: string
  endpoints: KeystoneEndpoint[]
}

export class OpenStackEngine {
  private static async getAuthToken(config: OpenStackConfig) {
    const domain = config.domainName || 'Default'
    
    const body = {
      auth: {
        identity: {
          methods: ['password'],
          password: {
            user: {
              name: config.username,
              domain: { name: domain },
              password: config.password
            }
          }
        },
        scope: {
          project: {
            name: config.projectName,
            domain: { name: domain }
          }
        }
      }
    }

    const response = await fetch(`${config.authUrl}/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenStack Authentication failed: ${error}`)
    }

    const token = response.headers.get('X-Subject-Token')
    const data = await response.json()

    if (!token) throw new Error('No token returned from OpenStack')

    // Find Glance endpoint
    const catalog = data.token.catalog as KeystoneService[]
    const imageService = catalog.find((s) => s.type === 'image')
    if (!imageService) throw new Error('Image service (Glance) not found in OpenStack catalog')

    const region = config.region || 'RegionOne'
    const endpoint = imageService.endpoints.find((e) => e.interface === 'public' && e.region === region)
      || imageService.endpoints.find((e) => e.interface === 'public')
      || imageService.endpoints[0]

    return {
      token,
      glanceUrl: endpoint.url
    }
  }

  static async uploadImage(
    config: OpenStackConfig, 
    filePath: string, 
    metadata: OpenStackImageMetadata
  ) {
    const { token, glanceUrl } = await this.getAuthToken(config)

    // 1. Create Image Record
    const createResponse = await fetch(`${glanceUrl}/v2/images`, {
      method: 'POST',
      headers: {
        'X-Auth-Token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: metadata.name,
        disk_format: metadata.diskFormat,
        container_format: metadata.containerFormat,
        visibility: metadata.visibility
      })
    })

    if (!createResponse.ok) {
      throw new Error(`Failed to create OpenStack image record: ${await createResponse.text()}`)
    }

    const image = await createResponse.json()
    const imageId = image.id as string

    // 2. Upload Binary Data
    const stats = fs.statSync(filePath)
    const fileStream = fs.createReadStream(filePath)

    const uploadResponse = await fetch(`${glanceUrl}/v2/images/${imageId}/file`, {
      method: 'PUT',
      headers: {
        'X-Auth-Token': token,
        'Content-Type': 'application/octet-stream',
        'Content-Length': stats.size.toString()
      },
      body: fileStream as unknown as BodyInit,
      // @ts-expect-error - 'duplex' is required in Node.js fetch for streams
      duplex: 'half'
    })

    if (!uploadResponse.ok) {
      throw new Error(`OpenStack image upload failed: ${await uploadResponse.text()}`)
    }

    return imageId
  }
}
