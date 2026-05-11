'use client'

import { useState } from 'react'
import { Globe, Edit2, Check, X, Trash2 } from 'lucide-react'
import { updateOpenStackProvider, deleteOpenStackProvider } from '@/lib/actions/openstack-providers'

interface Provider {
  id: string
  name: string
  authUrl: string
  region: string
  domainName: string
}

interface OpenStackProviderItemProps {
  provider: Provider
}

export default function OpenStackProviderItem({ provider }: OpenStackProviderItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (isEditing) {
    return (
      <form 
        action={async (formData) => {
          await updateOpenStackProvider(provider.id, formData)
          setIsEditing(false)
        }}
        className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-indigo-600 uppercase">Provider Name</label>
            <input 
              name="name" 
              type="text" 
              required 
              defaultValue={provider.name}
              className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-indigo-600 uppercase">Auth URL</label>
            <input 
              name="authUrl" 
              type="url" 
              required 
              defaultValue={provider.authUrl}
              className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-indigo-600 uppercase">Region</label>
            <input 
              name="region" 
              type="text" 
              required 
              defaultValue={provider.region}
              className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-indigo-600 uppercase">Domain</label>
            <input 
              name="domainName" 
              type="text" 
              required 
              defaultValue={provider.domainName}
              className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100">
          <button 
            type="button" 
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Save Changes
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-200 transition-all flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Globe className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900">{provider.name}</h4>
          <p className="text-xs font-mono text-slate-500">{provider.authUrl}</p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
            {provider.region} • {provider.domainName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
          title="Edit Provider"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete the "${provider.name}" OpenStack provider?`)) {
              deleteOpenStackProvider(provider.id)
            }
          }}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          title="Delete Provider"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
