'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auditLog } from '@/lib/audit'

export async function createRecipe(formData: FormData) {
  const user = await requireAuth()
  
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const packagesRaw = formData.get('packages') as string
  const runcmdRaw = formData.get('runcmd') as string
  const isPublic = formData.get('isPublic') === 'on'

  const packages = packagesRaw
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0)

  const runcmd = runcmdRaw
    ? runcmdRaw.split('\n').map(c => c.trim()).filter(c => c.length > 0)
    : []

  const recipe = await prisma.recipe.create({
    data: {
      name,
      description: description || null,
      packages: JSON.stringify(packages),
      runcmd: JSON.stringify(runcmd),
      isPublic,
      userId: user.id
    }
  })

  await auditLog('RECIPE_CREATE', { resourceId: recipe.id, resourceName: recipe.name })

  revalidatePath('/settings/recipes')
  redirect('/settings/recipes')
}

export async function updateRecipe(id: string, formData: FormData) {
  const user = await requireAuth()
  
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const packagesRaw = formData.get('packages') as string
  const runcmdRaw = formData.get('runcmd') as string
  const isPublic = formData.get('isPublic') === 'on'

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
      runcmd: JSON.stringify(runcmd),
      isPublic
    }
  })

  revalidatePath('/settings/recipes')
  redirect('/settings/recipes')
}

export async function deleteRecipe(id: string) {
  const user = await requireAuth()
  // Ensure user owns it or is admin
  const recipe = await prisma.recipe.findUnique({ where: { id } })
  if (recipe && (recipe.userId === user.id || user.role === 'ADMIN')) {
    await prisma.recipe.delete({ where: { id } })
  }
  revalidatePath('/settings/recipes')
}

export async function getRecipes() {
  const user = await requireAuth()
  // Admins see all, users see theirs
  if (user.role === 'ADMIN') {
    return await prisma.recipe.findMany({
      orderBy: { name: 'asc' }
    })
  }
  return await prisma.recipe.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' }
  })
}

export async function getPublicRecipes() {
  await requireAuth()
  return await prisma.recipe.findMany({
    where: { isPublic: true },
    include: { user: { select: { username: true } } },
    orderBy: { name: 'asc' }
  })
}

export async function cloneRecipe(id: string) {
  const user = await requireAuth()
  const recipe = await prisma.recipe.findUnique({ where: { id } })
  
  if (!recipe || !recipe.isPublic) {
    throw new Error("Recipe not found or not public")
  }

  await prisma.recipe.create({
    data: {
      name: `${recipe.name} (Clone)`,
      description: recipe.description,
      packages: recipe.packages,
      runcmd: recipe.runcmd,
      isPublic: false,
      userId: user.id
    }
  })

  revalidatePath('/settings/recipes')
  redirect('/settings/recipes')
}
