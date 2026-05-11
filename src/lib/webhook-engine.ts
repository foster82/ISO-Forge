import { prisma } from './prisma'
import crypto from 'crypto'

export type WebhookEvent = 
  | 'BUILD_COMPLETED' 
  | 'BUILD_FAILED' 
  | 'BOOT_TEST_PASSED' 
  | 'BOOT_TEST_FAILED'
  | 'IMAGE_READY'

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: any
}

export class WebhookEngine {
  static async trigger(event: WebhookEvent, data: any) {
    const webhooks = await prisma.webhook.findMany({
      where: { active: true }
    })

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data
    }

    const payloadString = JSON.stringify(payload)

    for (const webhook of webhooks) {
      const allowedEvents = JSON.parse(webhook.eventTypes) as WebhookEvent[]
      if (!allowedEvents.includes(event)) continue

      console.log(`[WEBHOOK] Triggering ${event} for ${webhook.name} (${webhook.url})`)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'ISO-Forge-Webhook'
      }

      if (webhook.secret) {
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(payloadString)
          .digest('hex')
        headers['X-ISO-Forge-Signature'] = signature
      }

      fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payloadString
      }).catch(err => {
        console.error(`[WEBHOOK ERROR] Failed to send to ${webhook.name}:`, err)
      })
    }
  }
}
