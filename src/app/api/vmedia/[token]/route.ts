import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const vmToken = await prisma.virtualMediaToken.findUnique({
    where: { token },
    include: { job: true }
  })

  if (!vmToken) {
    return new Response('Invalid or expired token', { status: 404 })
  }

  if (new Date() > vmToken.expiresAt) {
    // Cleanup expired token
    await prisma.virtualMediaToken.delete({ where: { id: vmToken.id } })
    return new Response('Token has expired', { status: 410 })
  }

  const filePath = vmToken.job.outputPath
  if (!filePath || !fs.existsSync(filePath)) {
    return new Response('ISO file not found on disk', { status: 404 })
  }

  const stats = fs.statSync(filePath)
  const fileStream = fs.createReadStream(filePath)

  // Convert Node ReadStream to Web ReadableStream
  const stream = Readable.toWeb(fileStream)

  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'application/x-cd-image',
      'Content-Length': stats.size.toString(),
      'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
    },
  })
}
