import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { getOpenStackProviders } from '@/lib/actions/openstack-providers'
import { createOpenStackProvider } from '@/lib/actions/openstack-providers'
import { createBareMetalProvider } from '@/lib/actions/bare-metal'
import { Globe, Server, Plus } from 'lucide-react'
import OpenStackProviderItem from '@/components/OpenStackProviderItem'
import BareMetalProviderItem from '@/components/BareMetalProviderItem'

export default async function InfrastructureSettingsPage() {
  await requireAdmin()
  const providers = await getOpenStackProviders()
  const bareMetalProviders = await prisma.bareMetalProvider.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Infrastructure Providers</h1>
        <p className="text-sm text-slate-500 mt-1">Connect to Cloud and Bare Metal endpoints for automated deployment.</p>
      </div>

      {/* Cloud Provider Integration (OpenStack) */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-600" />
                OpenStack Cloud Providers
              </h2>
              <p className="text-sm text-slate-500 mt-1">Register multiple OpenStack instances. Users will provide their own credentials when pushing images.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            {/* Add Provider Form */}
            <div className="lg:col-span-1 p-6 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Add Cloud Endpoint
              </h3>
              <form action={createOpenStackProvider} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Provider Name</label>
                  <input name="name" type="text" required placeholder="e.g. Production Cloud" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Auth URL</label>
                  <input name="authUrl" type="url" required placeholder="https://...:5000/v3" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Region</label>
                    <input name="region" type="text" defaultValue="RegionOne" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Domain</label>
                    <input name="domainName" type="text" defaultValue="Default" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition-all">
                  Register Provider
                </button>
              </form>
            </div>

            {/* Provider List */}
            <div className="lg:col-span-2 space-y-4">
              {providers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <Globe className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400">No OpenStack providers registered yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {providers.map(provider => (
                    <OpenStackProviderItem key={provider.id} provider={provider} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bare Metal Provisioning (CIMC / iDRAC) */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-600" />
                Bare Metal Providers (CIMC / iDRAC)
              </h2>
              <p className="text-sm text-slate-500 mt-1">Register physical servers to enable remote ISO mounting and automated provisioning via Redfish.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            {/* Add Provider Form */}
            <div className="lg:col-span-1 p-6 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Register Physical Server
              </h3>
              <form action={createBareMetalProvider} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Server Name</label>
                  <input name="name" type="text" required placeholder="e.g. Rack-A-Unit-04" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Provider Type</label>
                    <select name="providerType" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm">
                      <option value="CIMC">Cisco CIMC</option>
                      <option value="IDRAC">Dell iDRAC</option>
                      <option value="GENERIC_REDFISH">Generic Redfish</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Management IP</label>
                    <input name="managementIp" type="text" required placeholder="192.168.1..." className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
                    <input name="username" type="text" required defaultValue="admin" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                    <input name="password" type="password" required className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition-all">
                  Register Bare Metal Node
                </button>
              </form>
            </div>

            {/* Provider List */}
            <div className="lg:col-span-2 space-y-4">
              {bareMetalProviders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <Server className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400">No bare metal servers registered yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {bareMetalProviders.map(provider => (
                    <BareMetalProviderItem key={provider.id} provider={provider} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
