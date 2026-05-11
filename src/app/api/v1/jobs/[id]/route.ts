import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { validateApiRequest } from '../../images/route'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateApiRequest()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const job = await prisma.buildJob.findUnique({
    where: { id },
    include: {
      profile: true
    }
  })

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json(job)
}
