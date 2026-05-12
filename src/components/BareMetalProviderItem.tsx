'use client'

import { BareMetalProvider } from '../../prisma/generated/client'
import { Server, Trash2, Globe, Shield, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { deleteBareMetalProvider } from '@/lib/actions/bare-metal'
import { useState } from 'react'

export default function BareMetalProviderItem({ provider }: { provider: BareMetalProvider }) {
  const [isDeleting, setIsDeleting] = useState(false)

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

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors text-slate-400 group-hover:text-indigo-600">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900">{provider.name}</h4>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                provider.providerType === 'CIMC' ? 'bg-blue-100 text-blue-700' : 
                provider.providerType === 'IDRAC' ? 'bg-orange-100 text-orange-700' : 
                'bg-slate-100 text-slate-600'
              }`}>
                {provider.providerType}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Globe className="w-3 h-3" />
                {provider.managementIp}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Shield className="w-3 h-3" />
                {provider.username}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
  )
}
