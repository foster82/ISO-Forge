import { BareMetalProvider } from '../../prisma/generated/client'

export interface RedfishResponse {
  success: boolean
  message: string
}

export class RedfishEngine {
  private static getAuthHeader(provider: BareMetalProvider) {
    const auth = Buffer.from(`${provider.username}:${provider.password}`).toString('base64')
    return { 'Authorization': `Basic ${auth}` }
  }

  private static async request(provider: BareMetalProvider, path: string, options: RequestInit = {}) {
    const url = `https://${provider.managementIp}${path}`
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(provider),
      ...options.headers
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        // @ts-expect-error - node-fetch specific
        agent: new (require('https').Agent)({ rejectUnauthorized: false })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Redfish Error [${response.status}]:`, errorText)
        return { success: false, status: response.status, data: errorText }
      }

      if (response.status === 204) return { success: true, status: 204 }

      const data = await response.json()
      return { success: true, status: response.status, data }
    } catch (error) {
      console.error('Redfish Fetch Error:', error)
      return { success: false, error: String(error) }
    }
  }

  static async testConnection(provider: BareMetalProvider): Promise<RedfishResponse> {
    const result = await this.request(provider, '/redfish/v1')
    if (result.success) {
      return { success: true, message: 'Successfully connected to Redfish API.' }
    }
    return { success: false, message: `Connection failed: ${result.error || 'Invalid credentials or network timeout'}` }
  }

  private static async getVirtualMediaEndpoint(provider: BareMetalProvider): Promise<string | null> {
    // 1. Get Managers
    const managersResult = await this.request(provider, '/redfish/v1/Managers')
    if (!managersResult.success || !managersResult.data.Members?.length) return null

    const managerId = managersResult.data.Members[0]['@odata.id']

    // 2. Get Virtual Media Collection
    const vMediaResult = await this.request(provider, `${managerId}/VirtualMedia`)
    if (!vMediaResult.success || !vMediaResult.data.Members?.length) return null

    // We typically want the first one (CD/DVD)
    return vMediaResult.data.Members[0]['@odata.id']
  }

  static async mountIso(provider: BareMetalProvider, isoUrl: string): Promise<RedfishResponse> {
    const endpoint = await this.getVirtualMediaEndpoint(provider)
    if (!endpoint) return { success: false, message: 'Could not locate Virtual Media endpoint on server.' }

    // Insert Media
    const actionPath = `${endpoint}/Actions/VirtualMedia.InsertMedia`
    const payload = {
      Image: isoUrl,
      Inserted: true,
      WriteProtected: true
    }

    // Some implementations (CIMC) might need TransferProtocolType
    if (provider.providerType === 'CIMC') {
      Object.assign(payload, {
        TransferProtocolType: isoUrl.startsWith('https') ? 'HTTPS' : 'HTTP',
        TransferMethod: 'Stream'
      })
    }

    const result = await this.request(provider, actionPath, {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    if (result.success) {
      return { success: true, message: 'ISO mount command sent successfully.' }
    }
    return { success: false, message: `Failed to mount ISO: ${result.data || result.error}` }
  }

  static async ejectIso(provider: BareMetalProvider): Promise<RedfishResponse> {
    const endpoint = await this.getVirtualMediaEndpoint(provider)
    if (!endpoint) return { success: false, message: 'Could not locate Virtual Media endpoint.' }

    const actionPath = `${endpoint}/Actions/VirtualMedia.EjectMedia`
    const result = await this.request(provider, actionPath, {
      method: 'POST',
      body: JSON.stringify({})
    })

    if (result.success) {
      return { success: true, message: 'ISO ejected successfully.' }
    }
    return { success: false, message: `Failed to eject ISO: ${result.data || result.error}` }
  }

  static async powerCycle(provider: BareMetalProvider): Promise<RedfishResponse> {
    // Get Systems
    const systemsResult = await this.request(provider, '/redfish/v1/Systems')
    if (!systemsResult.success || !systemsResult.data.Members?.length) return { success: false, message: 'Could not locate System endpoint.' }

    const systemId = systemsResult.data.Members[0]['@odata.id']
    const actionPath = `${systemId}/Actions/ComputerSystem.Reset`

    const result = await this.request(provider, actionPath, {
      method: 'POST',
      body: JSON.stringify({ ResetType: 'ForceRestart' })
    })

    if (result.success) {
      return { success: true, message: 'Server power cycle command sent.' }
    }
    return { success: false, message: `Failed to reboot server: ${result.data || result.error}` }
  }
}
