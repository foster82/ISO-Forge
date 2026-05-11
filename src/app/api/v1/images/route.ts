import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * Basic authentication helper for API routes.
 * Checks for either a valid session OR an 'x-api-key' header.
 */
export async function validateApiRequest(request?: Request) {
  const session = await auth()
  if (session?.user) return session.user

  if (request) {
    const apiKey = request.headers.get('x-api-key')
    if (apiKey) {
      const user = await prisma.user.findUnique({
        where: { apiKey }
      })
      if (user) {
        return {
          ...user,
          groups: JSON.parse(user.groups || '[]') as string[]
        }
      }
    }
  }

  return null
}

export async function GET(request: Request) {
  const user = await validateApiRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const images = await prisma.baseImage.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(images)
}
