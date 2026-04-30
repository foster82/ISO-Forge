import { prisma } from '@/lib/prisma'

export async function getSettings() {
  const settings = await prisma.globalSettings.findUnique({
    where: { id: 'default' }
  })
  
  if (!settings) {
    return await prisma.globalSettings.create({
      data: {
        id: 'default',
        companyName: 'ISO Forge'
      }
    })
  }
  
  return settings
}
