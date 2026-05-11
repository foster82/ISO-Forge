import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { validateApiRequest } from '../images/route'

export async function GET() {
  const user = await validateApiRequest()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobs = await prisma.buildJob.findMany({
    include: {
      profile: {
        select: {
          name: true,
          hostname: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  return NextResponse.json(jobs)
}
