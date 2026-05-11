import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const job = await prisma.buildJob.findUnique({
    where: { id },
    include: { profile: true }
  })

  if (!job) {
    return new Response('Not Found', { status: 404 })
  }

  const metaData = `instance-id: ${job.id}
local-hostname: ${job.profile.hostname}
`

  return new Response(metaData, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
