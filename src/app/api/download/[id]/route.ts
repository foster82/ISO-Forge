import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const job = await prisma.buildJob.findUnique({
    where: { id },
    include: { profile: true }
  })

  if (!job || !job.outputPath || !fs.existsSync(job.outputPath)) {
    return new NextResponse('File not found', { status: 404 })
  }

  const fileBuffer = fs.readFileSync(job.outputPath)
  const extension = job.outputPath.split('.').pop() || 'iso'
  const fileName = `${job.profile.hostname}-${id.substring(0, 8)}.${extension}`
  const contentType = extension === 'iso' ? 'application/x-iso9660-image' : 'application/octet-stream'

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
