import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * Basic authentication helper for API routes.
 * Checks for either a valid session OR an 'x-api-key' header.
 * Note: Actual API Key support should be added to the User model eventually.
 * For now, we prioritize session-based CLI access or simple header check.
 */
export async function validateApiRequest() {
  const session = await auth()
  if (session?.user) return session.user

  // Future: Add API key check here
  // const apiKey = request.headers.get('x-api-key')
  // if (apiKey) { ... }

  return null
}

export async function GET() {
  const user = await validateApiRequest()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const images = await prisma.baseImage.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(images)
}
