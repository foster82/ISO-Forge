'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createRecipe(formData: FormData) {
  await requireAuth()
  
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const packagesRaw = formData.get('packages') as string
  const runcmdRaw = formData.get('runcmd') as string

  const packages = packagesRaw
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0)

  const runcmd = runcmdRaw
    ? runcmdRaw.split('\n').map(c => c.trim()).filter(c => c.length > 0)
    : []

  await prisma.recipe.create({
    data: {
      name,
      description: description || null,
      packages: JSON.stringify(packages),
      runcmd: JSON.stringify(runcmd)
    }
  })

  revalidatePath('/settings/recipes')
  redirect('/settings/recipes')
}

export async function updateRecipe(id: string, formData: FormData) {
  await requireAuth()
  
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const packagesRaw = formData.get('packages') as string
  const runcmdRaw = formData.get('runcmd') as string

  const packages = packagesRaw
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0)

  const runcmd = runcmdRaw
    ? runcmdRaw.split('\n').map(c => c.trim()).filter(c => c.length > 0)
    : []

  await prisma.recipe.update({
    where: { id },
    data: {
      name,
      description: description || null,
      packages: JSON.stringify(packages),
      runcmd: JSON.stringify(runcmd)
    }
  })

  revalidatePath('/settings/recipes')
  redirect('/settings/recipes')
}

export async function deleteRecipe(id: string) {
  await requireAuth()
  await prisma.recipe.delete({ where: { id } })
  revalidatePath('/settings/recipes')
}

export async function getRecipes() {
  await requireAuth()
  return await prisma.recipe.findMany({
    orderBy: { name: 'asc' }
  })
}
