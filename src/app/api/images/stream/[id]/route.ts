import { NextRequest } from 'next/server'
import { logEvents } from '@/lib/events'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  const responseStream = new TransformStream()
  const writer = responseStream.writable.getWriter()
  const encoder = new TextEncoder()

  const onProgress = (progress: number) => {
    writer.write(encoder.encode(`data: ${JSON.stringify({ progress })}\n\n`))
  }

  // Subscribe to progress events for this specific image
  logEvents.on(`progress:${id}`, onProgress)

  // Keep connection alive
  const heartbeat = setInterval(() => {
    writer.write(encoder.encode(': heartbeat\n\n'))
  }, 15000)

  req.signal.addEventListener('abort', () => {
    clearInterval(heartbeat)
    logEvents.off(`progress:${id}`, onProgress)
    writer.close()
  })

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
