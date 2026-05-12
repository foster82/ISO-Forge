'use client'

import { BareMetalProvider } from '../../prisma/generated/client'
import { 
  Server, Trash2, Globe, Shield, CheckCircle, 
  XCircle, RefreshCw, Power, Zap, AlertTriangle,
  Settings2, Activity
} from 'lucide-react'
import { 
  deleteBareMetalProvider, 
  getServerStatusAction, 
  controlServerPowerAction 
} from '@/lib/actions/bare-metal'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'

export default function BareMetalProviderItem({ provider }: { provider: BareMetalProvider }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await getServerStatusAction(provider.id)
      if (res.success) {
        setStatus(res)
      } else {
        setError(res.message || 'Failed to reach BMC')
      }
    } catch (e) {
      setError('Connection Error')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePowerAction = async (action: 'On' | 'ForceOff' | 'ForceRestart') => {
    if (!confirm(`Are you sure you want to send '${action}' command to ${provider.name}?`)) return
    
    setIsLoading(true)
    try {
      const res = await controlServerPowerAction(provider.id, action)
      if (res.success) {
        alert(res.message)
        setTimeout(fetchStatus, 5000) // Re-fetch after 5s to see state change
      } else {
        alert(`Failed: ${res.message}`)
      }
    } catch (e) {
      alert('Action failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to remove ${provider.name}?`)) {
      setIsDeleting(true)
      try {
        await deleteBareMetalProvider(provider.id)
      } catch (e) {
        setIsDeleting(false)
        alert('Failed to delete provider.')
      }
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    fetchStatus()
  }, [])

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all group overflow-hidden">
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={clsx(
            "p-3 rounded-lg transition-colors",
            status?.health === 'OK' ? "bg-emerald-50 text-emerald-600" :
            status?.health === 'Warning' ? "bg-amber-50 text-amber-600" :
            status?.health === 'Critical' ? "bg-red-50 text-red-600" :
            "bg-slate-50 text-slate-400"
          )}>
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900">{provider.name}</h4>
              <span className={clsx(
                "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                provider.providerType === 'CIMC' ? 'bg-blue-100 text-blue-700' : 
                provider.providerType === 'IDRAC' ? 'bg-orange-100 text-orange-700' : 
                'bg-slate-100 text-slate-600'
              )}>
                {provider.providerType}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <Globe className="w-3 h-3" />
                {provider.managementIp}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 uppercase">
                <Shield className="w-3 h-3" />
                {provider.username}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Section */}
          <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
            {isLoading ? (
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                POLLING BMC...
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-[10px] font-bold text-red-500">
                <AlertTriangle className="w-3 h-3" />
                OFFLINE
              </div>
            ) : status ? (
              <>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Power</span>
                  <div className="flex items-center gap-1.5">
                    <div className={clsx(
                      "w-1.5 h-1.5 rounded-full shadow-sm",
                      status.powerState === 'On' ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                    )} />
                    <span className="text-[10px] font-bold text-slate-700 uppercase">{status.powerState}</span>
                  </div>
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Health</span>
                  <span className={clsx(
                    "text-[10px] font-bold uppercase",
                    status.health === 'OK' ? "text-emerald-600" : "text-amber-600"
                  )}>{status.health || 'Unknown'}</span>
                </div>
              </>
            ) : (
              <button onClick={fetchStatus} className="text-[10px] font-bold text-indigo-600 hover:underline">
                FETCH STATUS
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePowerAction('On')}
              disabled={isLoading || status?.powerState === 'On'}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              title="Power On"
            >
              <Power className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePowerAction('ForceOff')}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Force Off"
            >
              <Zap className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePowerAction('ForceRestart')}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
              title="Reboot"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Remove Provider"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Bottom Info Bar (Model/Serial) */}
      {status && (
        <div className="px-5 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-6">
          <div className="flex items-center gap-2">
             <Activity className="w-3 h-3 text-slate-400" />
             <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
               {status.model || 'Unknown Model'}
             </span>
          </div>
          <div className="flex items-center gap-2">
             <Settings2 className="w-3 h-3 text-slate-400" />
             <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
               SN: {status.serialNumber || 'N/A'}
             </span>
          </div>
        </div>
      )}
    </div>
  )
}
