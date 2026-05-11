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

  const onLog = (data: { message: string, type: string }) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  // Subscribe to log events for this specific job
  logEvents.on(`log:${id}`, onLog)

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    writer.write(encoder.encode(': heartbeat\n\n'))
  }, 15000)

  req.signal.addEventListener('abort', () => {
    clearInterval(heartbeat)
    logEvents.off(`log:${id}`, onLog)
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
