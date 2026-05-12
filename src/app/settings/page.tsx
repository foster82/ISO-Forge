import { getSettings } from '@/lib/settings'
import { requireAuth, isAdmin } from '@/lib/auth-utils'
import { Building, Image as ImageIcon, Globe, Save } from 'lucide-react'
import Image from 'next/image'
import { updateSettings } from '@/lib/actions/settings'

export default async function GeneralSettingsPage() {
  await requireAuth()
  const settings = await getSettings()
  const isUserAdmin = await isAdmin()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">General Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure application branding and regional defaults.</p>
      </div>

      <form action={updateSettings} className="space-y-8">
        {/* Branding Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600" />
              App Branding
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="companyName" className="text-sm font-medium text-slate-700">
                  Application Name
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  defaultValue={settings.companyName}
                  disabled={!isUserAdmin}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="companyLogo" className="text-sm font-medium text-slate-700">
                Logo URL or Base64
              </label>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <textarea
                    id="companyLogo"
                    name="companyLogo"
                    defaultValue={settings.companyLogo || ''}
                    disabled={!isUserAdmin}
                    placeholder="data:image/png;base64,..."
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 font-mono text-xs disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
                <div className="w-24 h-24 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden relative">
                  {settings.companyLogo ? (
                    <Image src={settings.companyLogo} alt="Logo Preview" fill className="object-contain" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-[10px]">No Logo</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Regional Defaults Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              Regional Defaults
            </h2>
            <p className="text-sm text-slate-500">Global defaults for new profiles.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="defaultTimezone" className="text-sm font-medium text-slate-700">
                  Default Timezone
                </label>
                <input
                  type="text"
                  id="defaultTimezone"
                  name="defaultTimezone"
                  defaultValue={settings.defaultTimezone}
                  disabled={!isUserAdmin}
                  placeholder="e.g. Europe/London"
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="defaultLocale" className="text-sm font-medium text-slate-700">
                  Default Locale
                </label>
                <input
                  type="text"
                  id="defaultLocale"
                  name="defaultLocale"
                  defaultValue={settings.defaultLocale}
                  disabled={!isUserAdmin}
                  placeholder="e.g. en_GB.UTF-8"
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>
        </div>

        {isUserAdmin && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Save className="w-5 h-5" />
              Save Branding & Defaults
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
