'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin, requireAuth } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

export async function createOpenStackProvider(formData: FormData) {
  await requireAdmin()
  
  const name = formData.get('name') as string
  const authUrl = formData.get('authUrl') as string
  const region = formData.get('region') as string || 'RegionOne'
  const domainName = formData.get('domainName') as string || 'Default'

  await prisma.openStackProvider.create({
    data: { name, authUrl, region, domainName }
  })

  revalidatePath('/settings')
}

export async function deleteOpenStackProvider(id: string) {
  await requireAdmin()
  await prisma.openStackProvider.delete({ where: { id } })
  revalidatePath('/settings')
}

export async function updateOpenStackProvider(id: string, formData: FormData) {
  await requireAdmin()
  
  const name = formData.get('name') as string
  const authUrl = formData.get('authUrl') as string
  const region = formData.get('region') as string
  const domainName = formData.get('domainName') as string

  await prisma.openStackProvider.update({
    where: { id },
    data: { name, authUrl, region, domainName }
  })

  revalidatePath('/settings')
}

export async function getOpenStackProviders() {
  await requireAuth()
  return await prisma.openStackProvider.findMany({
    orderBy: { name: 'asc' }
  })
}
