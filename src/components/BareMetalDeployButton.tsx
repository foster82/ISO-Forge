'use client'

import { useState } from 'react'
import { BareMetalProvider } from '../../prisma/generated/client'
import { Server, Monitor, RefreshCw, X, Play, CheckCircle, XCircle } from 'lucide-react'
import { deployToBareMetal } from '@/lib/actions/bare-metal'
import { clsx } from 'clsx'

export default function BareMetalDeployButton({ 
  jobId, 
  providers 
}: { 
  jobId: string, 
  providers: BareMetalProvider[] 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedProviderId, setSelectedProviderId] = useState('')
  const [forceReboot, setForceReboot] = useState(true)
  const [isDeploying, setIsDeploying] = useState(false)
  const [status, setStatus] = useState<{ success?: boolean, message?: string } | null>(null)

  const handleDeploy = async () => {
    if (!selectedProviderId) return

    setIsDeploying(true)
    setStatus(null)

    try {
      const result = await deployToBareMetal(jobId, selectedProviderId, forceReboot)
      setStatus(result)
      if (result.success) {
        setTimeout(() => {
          setIsOpen(false)
          setStatus(null)
        }, 3000)
      }
    } catch (e) {
      setStatus({ success: false, message: 'An unexpected error occurred during deployment.' })
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
        title="Deploy to Bare Metal (CIMC/iDRAC)"
      >
        <Server className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-indigo-600" />
                Deploy to Physical Server
              </h3>
              <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {!status ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Select Target Server</label>
                    {providers.length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                        No Bare Metal providers configured. Please add one in Settings first.
                      </div>
                    ) : (
                      <select
                        value={selectedProviderId}
                        onChange={(e) => setSelectedProviderId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">Choose a server...</option>
                        {providers.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.providerType} - {p.managementIp})</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Force Reboot</p>
                      <p className="text-xs text-slate-500">Restart server after mounting ISO.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={forceReboot}
                      onChange={(e) => setForceReboot(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleDeploy}
                      disabled={!selectedProviderId || isDeploying || providers.length === 0}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeploying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Communicating with BMC...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          Mount ISO & Deploy
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center space-y-4">
                  <div className="flex justify-center">
                    {status.success ? (
                      <div className="p-3 bg-emerald-100 rounded-full">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                      </div>
                    ) : (
                      <div className="p-3 bg-red-100 rounded-full">
                        <XCircle className="w-10 h-10 text-red-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={clsx(
                      "font-bold text-lg",
                      status.success ? "text-emerald-700" : "text-red-700"
                    )}>
                      {status.success ? "Deployment Started" : "Deployment Failed"}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">{status.message}</p>
                  </div>
                  <button 
                    onClick={() => setStatus(null)}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-slate-50 text-[10px] text-slate-400 border-t border-slate-100 italic">
              Uses Redfish API to mount Virtual Media remotely. Ensure the BMC has network access to this server.
            </div>
          </div>
        </div>
      )}
    </>
  )
}
