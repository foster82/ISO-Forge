'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

export async function createWebhook(formData: FormData) {
  await requireAdmin()
  
  const name = formData.get('name') as string
  const url = formData.get('url') as string
  const secret = formData.get('secret') as string
  
  const events = [
    formData.get('BUILD_COMPLETED') ? 'BUILD_COMPLETED' : null,
    formData.get('BUILD_FAILED') ? 'BUILD_FAILED' : null,
    formData.get('BOOT_TEST_PASSED') ? 'BOOT_TEST_PASSED' : null,
    formData.get('BOOT_TEST_FAILED') ? 'BOOT_TEST_FAILED' : null,
    formData.get('IMAGE_READY') ? 'IMAGE_READY' : null,
  ].filter(Boolean)

  await prisma.webhook.create({
    data: {
      name,
      url,
      secret: secret || null,
      eventTypes: JSON.stringify(events)
    }
  })

  revalidatePath('/settings/webhooks')
}

export async function deleteWebhook(id: string) {
  await requireAdmin()
  await prisma.webhook.delete({ where: { id } })
  revalidatePath('/settings/webhooks')
}

export async function toggleWebhook(id: string, active: boolean) {
  await requireAdmin()
  await prisma.webhook.update({
    where: { id },
    data: { active }
  })
  revalidatePath('/settings/webhooks')
}
