import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { validateApiRequest } from '../images/route'

export async function GET() {
  const user = await validateApiRequest()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profiles = await prisma.profile.findMany({
    include: {
      baseImage: {
        select: {
          name: true,
          version: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  return NextResponse.json(profiles)
}
