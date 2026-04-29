'use client'

import React, { useState, useMemo } from 'react'
import yaml from 'js-yaml'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface YamlEditorProps {
  initialValue?: string
  name: string
}

export default function YamlEditor({ initialValue = '', name }: YamlEditorProps) {
  const [value, setValue] = useState(initialValue)

  const { error, isValid } = useMemo(() => {
    if (!value.trim()) {
      return { error: null, isValid: true }
    }

    try {
      yaml.load(value)
      return { error: null, isValid: true }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { error: msg, isValid: false }
    }
  }, [value])

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={10}
          placeholder="# Example: late-commands: [ echo 'hello' ]"
          className={`w-full px-4 py-3 font-mono text-sm border rounded-lg focus:ring-2 outline-none transition-all ${
            isValid 
              ? 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500' 
              : 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50/30'
          }`}
        />
        
        <div className="absolute top-3 right-3">
          {value.trim() && (
            isValid 
              ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              : <AlertCircle className="w-5 h-5 text-red-500" />
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex gap-3 items-start">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700 font-mono whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {!error && value.trim() && (
        <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
          <CheckCircle2 className="w-3 h-3" />
          YAML syntax is valid
        </p>
      )}

      <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold tracking-tight">
        Custom autoinstall keys (e.g., late-commands, network, storage overrides)
      </p>
    </div>
  )
}
