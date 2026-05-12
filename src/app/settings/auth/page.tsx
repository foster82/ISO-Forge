import { getSettings } from '@/lib/settings'
import { requireAdmin } from '@/lib/auth-utils'
import { Shield, Network, Users, Save } from 'lucide-react'
import { updateSettings } from '@/lib/actions/settings'
import LdapTester from '@/components/LdapTester'

export default async function AuthSettingsPage() {
  await requireAdmin()
  const settings = await getSettings()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Authentication & RBAC</h1>
        <p className="text-sm text-slate-500 mt-1">Configure how users log in and how LDAP groups map to application roles.</p>
      </div>

      <form action={updateSettings} className="space-y-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Auth Method
            </h2>

            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-700">Select Provider Strategy</label>
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
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Network className="w-5 h-5 text-indigo-600" />
                LDAP Configuration
              </h2>
              <LdapTester />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">LDAP URL</label>
                <input
                  name="ldapUrl"
                  type="text"
                  defaultValue={settings.ldapUrl || ""}
                  placeholder="ldap://localhost:389"
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Base DN</label>
                <input
                  name="ldapBaseDn"
                  type="text"
                  defaultValue={settings.ldapBaseDn || ""}
                  placeholder="dc=example,dc=com"
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Bind DN (Optional)</label>
                <input
                  name="ldapBindDn"
                  type="text"
                  defaultValue={settings.ldapBindDn || ""}
                  placeholder="cn=admin,dc=example,dc=com"
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Bind Password (Optional)</label>
                <input
                  name="ldapBindPw"
                  type="password"
                  defaultValue={settings.ldapBindPw || ""}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">User Search Filter</label>
                <input
                  name="ldapFilter"
                  type="text"
                  defaultValue={settings.ldapFilter || "(uid={{username}})"}
                  placeholder="(uid={{username}})"
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                />
                <p className="text-[10px] text-slate-500">Use {"{{username}}"} as a placeholder for the login input.</p>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                Group-Based Role Mapping
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Admin Group</label>
                  <input
                    name="ldapAdminGroup"
                    type="text"
                    defaultValue={settings.ldapAdminGroup || ""}
                    placeholder="e.g. ISO-Forge-Admins"
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">User Group</label>
                  <input
                    name="ldapUserGroup"
                    type="text"
                    defaultValue={settings.ldapUserGroup || ""}
                    placeholder="e.g. IT-Staff"
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Save className="w-5 h-5" />
              Update Authentication
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
