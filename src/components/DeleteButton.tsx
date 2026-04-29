'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'

interface DeleteButtonProps {
  action: (formData: FormData) => Promise<void>
  confirmMessage: string
  id?: string
  className?: string
  iconSize?: number
}

export default function DeleteButton({ action, confirmMessage, id, className, iconSize = 5 }: DeleteButtonProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm(confirmMessage)) {
      e.preventDefault()
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="inline">
      {id && <input type="hidden" name="id" value={id} />}
      <button 
        type="submit" 
        className={className || "p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"}
      >
        <Trash2 className={`w-${iconSize} h-${iconSize}`} />
      </button>
    </form>
  )
}
