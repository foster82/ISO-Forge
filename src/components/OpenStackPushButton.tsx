'use client'

import { useState } from 'react'
import { Globe, CheckCircle, AlertCircle, X, Shield, User, Key, Box, Settings } from 'lucide-react'
import { pushToOpenStack } from '@/lib/actions/openstack'

interface OpenStackProvider {
  id: string
  name: string
  authUrl: string
  region: string
  domainName: string
}

interface OpenStackPushButtonProps {
  jobId: string
  providers: OpenStackProvider[]
  disabled?: boolean
}

export default function OpenStackPushButton({ jobId, providers, disabled }: OpenStackPushButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    providerId: providers[0]?.id || '',
    authUrl: providers[0]?.authUrl || '',
    username: '',
    password: '',
    projectName: '',
    domainName: providers[0]?.domainName || 'Default',
    region: providers[0]?.region || 'RegionOne'
  })

  const handleProviderChange = (providerId: string) => {
    if (providerId === 'custom') {
      setFormData({ ...formData, providerId: 'custom' })
      return
    }
    
    const provider = providers.find(p => p.id === providerId)
    if (provider) {
      setFormData({
        ...formData,
        providerId: provider.id,
        authUrl: provider.authUrl,
        domainName: provider.domainName,
        region: provider.region
      })
    }
  }

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setError(null)
    
    try {
      const result = await pushToOpenStack(jobId, {
        authUrl: formData.authUrl,
        username: formData.username,
        password: formData.password,
        projectName: formData.projectName,
        domainName: formData.domainName,
        region: formData.region
      })
      
      if (result.success) {
        setStatus('success')
        setTimeout(() => {
          setStatus('idle')
          setShowModal(false)
        }, 3000)
      } else {
        setStatus('error')
        setError(result.error || 'Unknown error')
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to trigger upload')
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={disabled || status === 'loading'}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-sm ${
          status === 'loading' ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed' :
          status === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
          'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
      >
        <Globe className="w-4 h-4 text-indigo-600" />
        {status === 'loading' ? 'Pushing...' : status === 'success' ? 'Pushed!' : 'Push to OpenStack'}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-600" />
                Push to OpenStack Glance
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handlePush} className="p-6 space-y-4">
              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Settings className="w-3 h-3" />
                  Select Cloud Instance
                </label>
                <select
                  value={formData.providerId}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value="custom">-- Custom Endpoint --</option>
                </select>
              </div>

              {formData.providerId === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Auth URL</label>
                  <input
                    type="url"
                    required
                    value={formData.authUrl}
                    onChange={(e) => setFormData({ ...formData, authUrl: e.target.value })}
                    placeholder="https://...:5000/v3"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
              )}

              {/* Credentials */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Box className="w-3 h-3" />
                    Project
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="e.g. admin"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Domain
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.domainName}
                    onChange={(e) => setFormData({ ...formData, domainName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                >
                  {status === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : status === 'success' ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Success!
                    </>
                  ) : (
                    'Start Upload'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
