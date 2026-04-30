import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { requireAdmin } from '@/lib/auth-utils'
import { ArrowLeft, Save, Building, Image as ImageIcon, Shield, Network } from 'lucide-react'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  await requireAdmin()
  const settings = await getSettings()

  async function updateSettings(formData: FormData) {
    'use server'
    await requireAdmin()
...
    const companyName = formData.get('companyName') as string
    const companyLogo = formData.get('companyLogo') as string
    const authType = formData.get('authType') as string
    
    const ldapUrl = formData.get('ldapUrl') as string
    const ldapBaseDn = formData.get('ldapBaseDn') as string
    const ldapBindDn = formData.get('ldapBindDn') as string
    const ldapBindPw = formData.get('ldapBindPw') as string
    const ldapFilter = formData.get('ldapFilter') as string

    await prisma.globalSettings.update({
      where: { id: 'default' },
      data: {
        companyName,
        companyLogo: companyLogo || null,
        authType,
        ldapUrl: ldapUrl || null,
        ldapBaseDn: ldapBaseDn || null,
        ldapBindDn: ldapBindDn || null,
        ldapBindPw: ldapBindPw || null,
        ldapFilter: ldapFilter || "(uid={{username}})"
      }
    })

    revalidatePath('/')
    revalidatePath('/settings')
    redirect('/')
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Global Settings</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 pb-20">
        <form action={updateSettings} className="space-y-8">
          {/* Branding Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 space-y-6">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                Company Branding
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-sm font-medium text-slate-700">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    defaultValue={settings.companyName}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
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
                      placeholder="data:image/png;base64,..."
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none h-24 font-mono text-xs"
                    />
                  </div>
                  <div className="w-24 h-24 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                    {settings.companyLogo ? (
                      <img src={settings.companyLogo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
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

          {/* Authentication Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 space-y-6">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Authentication Settings
              </h2>

              <div className="space-y-4">
                <label className="text-sm font-medium text-slate-700">Auth Method</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {["LOCAL", "LDAP", "BOTH"].map((type) => (
                    <label 
                      key={type}
                      className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50"
                    >
                      <input 
                        type="radio" 
                        name="authType" 
                        value={type} 
                        defaultChecked={settings.authType === type}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{type}</p>
                        <p className="text-[10px] text-slate-500">
                          {type === "LOCAL" ? "Database users only" : 
                           type === "LDAP" ? "LDAP server only" : "LDAP with Local fallback"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* LDAP Settings - Only show or highlight if LDAP/BOTH is selected */}
              <div className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Network className="w-4 h-4 text-slate-400" />
                  LDAP Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">LDAP URL</label>
                    <input
                      name="ldapUrl"
                      type="text"
                      defaultValue={settings.ldapUrl || ""}
                      placeholder="ldap://localhost:389"
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Base DN</label>
                    <input
                      name="ldapBaseDn"
                      type="text"
                      defaultValue={settings.ldapBaseDn || ""}
                      placeholder="dc=example,dc=com"
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Bind DN (Optional)</label>
                    <input
                      name="ldapBindDn"
                      type="text"
                      defaultValue={settings.ldapBindDn || ""}
                      placeholder="cn=admin,dc=example,dc=com"
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Bind Password (Optional)</label>
                    <input
                      name="ldapBindPw"
                      type="password"
                      defaultValue={settings.ldapBindPw || ""}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">User Search Filter</label>
                    <input
                      name="ldapFilter"
                      type="text"
                      defaultValue={settings.ldapFilter || "(uid={{username}})"}
                      placeholder="(uid={{username}})"
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm"
                    />
                    <p className="text-[10px] text-slate-500">Use {"{{username}}"} as a placeholder for the login input.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-6 right-6 lg:static flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Save className="w-5 h-5" />
              Save All Settings
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
