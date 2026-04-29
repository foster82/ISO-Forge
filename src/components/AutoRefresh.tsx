'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AutoRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      router.refresh()
    }, 2000)

    return () => clearInterval(interval)
  }, [enabled, router])

  return null
}
