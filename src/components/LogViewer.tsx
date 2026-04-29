'use client'

import React, { useEffect, useRef } from 'react'

interface LogViewerProps {
  content: string
  title: string
  icon: React.ReactNode
  isActive?: boolean
  variant?: 'emerald' | 'slate'
}

export default function LogViewer({ content, title, icon, isActive, variant = 'emerald' }: LogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [content])

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg overflow-hidden flex flex-col h-[400px]">
      <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-slate-200">{title}</span>
        </div>
        {isActive && (
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Live Capture</span>
          </div>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 p-6 font-mono text-[11px] overflow-y-auto bg-black scroll-smooth">
        <pre className={`${variant === 'emerald' ? 'text-emerald-400/90' : 'text-slate-300'} whitespace-pre-wrap leading-relaxed`}>
          {content}
        </pre>
        {isActive && (
          <div className="mt-4 flex items-center gap-2 text-amber-500 animate-pulse italic">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></span>
            Processing...
          </div>
        )}
      </div>
    </div>
  )
}
