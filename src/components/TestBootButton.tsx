'use client'

import { Play, Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'

export default function TestBootButton() {
  const { pending } = useFormStatus()

  return (
    <button 
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Play className="w-4 h-4 fill-current" />
      )}
      {pending ? 'Queueing...' : 'Test Boot'}
    </button>
  )
}
