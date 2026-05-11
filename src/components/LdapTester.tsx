'use client'

import React, { useState } from 'react'
import { CheckCircle2, XCircle, RefreshCw, FlaskConical } from 'lucide-react'
import { testLdapConnection } from '@/lib/actions/settings'

export default function LdapTester() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleTest = async (e: React.MouseEvent) => {
    e.preventDefault()
    const form = (e.target as HTMLButtonElement).form
    if (!form) return

    setStatus('loading')
    const formData = new FormData(form)
    
    try {
      const result = await testLdapConnection(formData)
      if (result.success) {
        setStatus('success')
        setMessage(result.message)
      } else {
        setStatus('error')
        setMessage(result.message)
      }
    } catch {
      setStatus('error')
      setMessage('An unexpected error occurred during the test.')
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-indigo-600" />
            Connection Tester
          </h4>
          <p className="text-[10px] text-slate-500">Verify your settings before saving.</p>
        </div>
        <button
          onClick={handleTest}
          disabled={status === 'loading'}
          className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
        >
          {status === 'loading' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Run Connection Test
        </button>
      </div>

      {status !== 'idle' && (
        <div className={`flex items-start gap-3 p-3 rounded-lg border ${
          status === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 
          status === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 
          'bg-indigo-50 border-indigo-100 text-indigo-800'
        }`}>
          {status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
          {status === 'error' && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
          {status === 'loading' && <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin shrink-0" />}
          
          <div className="text-xs">
            <p className="font-bold capitalize">{status === 'loading' ? 'Testing...' : status}</p>
            <p className="mt-1 opacity-90">{message || (status === 'loading' ? 'Attempting to bind and search...' : '')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
