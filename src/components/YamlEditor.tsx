'use client'

import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { validateCloudInit, ValidationResult } from '@/lib/actions/validation'

interface YamlEditorProps {
  initialValue?: string
  name: string
}

export default function YamlEditor({ initialValue = '', name }: YamlEditorProps) {
  const [value, setValue] = useState(initialValue)
  const [validation, setValidation] = useState<ValidationResult>({ valid: true })
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!value.trim()) {
        setValidation({ valid: true })
        return
      }
      setIsValidating(true)
      const result = await validateCloudInit(value)
      setValidation(result)
      setIsValidating(false)
    }, 500)

    return () => clearTimeout(timer)
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
            validation.valid 
              ? 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500' 
              : 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50/30'
          }`}
        />
        
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {isValidating && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
          {!isValidating && value.trim() && (
            validation.valid 
              ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              : <AlertCircle className="w-5 h-5 text-red-500" />
          )}
        </div>
      </div>

      {validation.error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex gap-3 items-start">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-red-700 font-mono whitespace-pre-wrap">{validation.error}</p>
            {validation.line && (
              <p className="text-[10px] text-red-500 mt-1 font-bold">
                Line {validation.line}, Column {validation.column}
              </p>
            )}
          </div>
        </div>
      )}

      {!validation.error && value.trim() && !isValidating && (
        <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
          <CheckCircle2 className="w-3 h-3" />
          Configuration is valid
        </p>
      )}

      <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold tracking-tight">
        Custom autoinstall keys (e.g., late-commands, network, storage overrides)
      </p>
    </div>
  )
}

