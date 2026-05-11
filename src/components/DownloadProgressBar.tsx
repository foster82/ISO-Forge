'use client'

import { useEffect, useState } from 'react'

interface DownloadProgressBarProps {
  imageId: string
  initialProgress: number
}

export default function DownloadProgressBar({ imageId, initialProgress }: DownloadProgressBarProps) {
  const [progress, setProgress] = useState(initialProgress)

  useEffect(() => {
    const eventSource = new EventSource(`/api/images/stream/${imageId}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (typeof data.progress === 'number') {
          setProgress(data.progress)
        }
      } catch (e) {
        console.error('Failed to parse progress event:', e)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [imageId])

  return (
    <div className="mt-2 w-full max-w-[120px]">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-slate-500 font-medium">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div 
          className="bg-amber-500 h-full transition-all duration-500" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  )
}
