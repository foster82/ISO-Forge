import { getSettings } from '@/lib/settings'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { ArrowLeft, Save, Building, Image as ImageIcon, Shield, Network, Trash2, Wrench, Database, Download, Plus, Users, Edit2, Globe, Bell, HardDrive, Disc, Server } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { clsx } from 'clsx'
import { updateSettings } from '@/lib/actions/settings'
import { cleanupJobs } from '@/lib/actions/jobs'
import { createOpenStackProvider, deleteOpenStackProvider, getOpenStackProviders } from '@/lib/actions/openstack-providers'
import { createBareMetalProvider } from '@/lib/actions/bare-metal'
import { BackupEngine } from '@/lib/backup-engine'
import { SystemStats } from '@/lib/system-stats'
import { triggerBackup, removeBackup } from '@/lib/actions/backups'
import DeleteButton from '@/components/DeleteButton'
import LdapTester from '@/components/LdapTester'
import OpenStackProviderItem from '@/components/OpenStackProviderItem'
import BareMetalProviderItem from '@/components/BareMetalProviderItem'

export default async function SettingsPage() {
  await requireAdmin()
  const settings = await getSettings()
  const backups = await BackupEngine.listBackups()
  const providers = await getOpenStackProviders()
  const bareMetalProviders = await prisma.bareMetalProvider.findMany({ orderBy: { name: 'asc' } })
  const storageStats = await SystemStats.getStorageStats()

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
        <div className="space-y-8">
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
                <p className="text-sm text-slate-500">Default settings for new profiles. These can be overridden on a per-profile basis.</p>

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
                      placeholder="e.g. Europe/London"
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
                      placeholder="e.g. en_GB.UTF-8"
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Retention Policies Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 space-y-6">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  Automated Maintenance & Retention
                </h2>
                <p className="text-sm text-slate-500">Configure how long build history and custom images are kept on the server.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Enable Auto-Cleanup</p>
                        <p className="text-xs text-slate-500">Automatically remove old builds once an hour.</p>
                      </div>
                      <input 
                        type="checkbox" 
                        name="autoCleanupEnabled" 
                        defaultChecked={settings.autoCleanupEnabled}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Job History Retention (Days)</label>
                      <input
                        name="jobRetentionDays"
                        type="number"
                        min="1"
                        defaultValue={settings.jobRetentionDays}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <p className="text-[10px] text-slate-500">Delete all build records and files older than this.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Max Builds Per Profile</label>
                      <input
                        name="buildRetentionCount"
                        type="number"
                        min="1"
                        defaultValue={settings.buildRetentionCount}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <p className="text-[10px] text-slate-500">Keep only the N most recent successful builds for each profile.</p>
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Network className="w-4 h-4 text-slate-400" />
                      LDAP Configuration
                    </h3>
                  </div>

                  <LdapTester />

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

                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      Group-Based Role Mapping (RBAC)
                    </h3>
                    <p className="text-[10px] text-slate-500">Map LDAP groups to application roles. Role mapping happens automatically upon login.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Admin Group (Full Access)</label>
                        <input
                          name="ldapAdminGroup"
                          type="text"
                          defaultValue={settings.ldapAdminGroup || ""}
                          placeholder="e.g. ISO-Forge-Admins"
                          className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">User Group (Restricted)</label>
                        <input
                          name="ldapUserGroup"
                          type="text"
                          defaultValue={settings.ldapUserGroup || ""}
                          placeholder="e.g. IT-Staff"
                          className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                        <p className="text-[10px] text-slate-500 italic">If provided, only members of this group can log in.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 pt-0 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  <Save className="w-5 h-5" />
                  Save Global Settings
                </button>
              </div>
            </div>
          </form>

          {/* Configuration Recipes Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-indigo-600" />
                    Configuration Recipes
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Manage reusable bundles of packages and scripts to apply to profiles.</p>
                </div>
                <Link
                  href="/settings/recipes"
                  className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Manage Recipes
                </Link>
              </div>
            </div>
          </div>

          {/* Webhooks Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-600" />
                    Outgoing Webhooks
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Send real-time notifications to Slack, Discord, or custom APIs.</p>
                </div>
                <Link
                  href="/settings/webhooks"
                  className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Manage Webhooks
                </Link>
              </div>
            </div>
          </div>

          {/* Storage & Image Management Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    Storage & Image Management
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Monitor disk usage and manage base images and build outputs to prevent running out of space.</p>
                  </div>
                  <div className="flex items-center gap-3">
                  <Link
                    href="/images"
                    className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Disc className="w-4 h-4" />
                    Manage Base Images
                  </Link>
                  <Link
                    href="/settings/builds"
                    className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <HardDrive className="w-4 h-4" />
                    Manage Build Outputs
                  </Link>
                  <Link
                    href="/settings/users"
                    className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Users className="w-4 h-4" />
                    User Usage & Quotas
                  </Link>
                  </div>                  </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Disk Space</p>
                  <p className="text-2xl font-bold text-slate-900">{formatSize(storageStats.totalBytes)}</p>
                  <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={clsx(
                        "h-full rounded-full transition-all",
                        storageStats.percentUsed > 90 ? "bg-red-500" : 
                        storageStats.percentUsed > 70 ? "bg-amber-500" : "bg-indigo-500"
                      )}
                      style={{ width: `${storageStats.percentUsed}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 font-medium">
                    {storageStats.percentUsed}% used on system partition
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">App Storage Dir</p>
                  <p className="text-2xl font-bold text-slate-900">{formatSize(storageStats.storageDirSize)}</p>
                  <p className="mt-2 text-[10px] text-slate-500 font-medium">
                    Total size of all ISOs, images, and builds
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Available Space</p>
                  <p className="text-2xl font-bold text-slate-900">{formatSize(storageStats.freeBytes)}</p>
                  <p className="mt-2 text-[10px] text-slate-500 font-medium italic">
                    {storageStats.freeBytes < 10 * 1024 * 1024 * 1024 ? "Warning: Low disk space!" : "Sufficient space remaining"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Database Backups Section */}          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  Database Backups
                </h2>
                <form action={async () => { 'use server'; await triggerBackup(); }}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Backup
                  </button>
                </form>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <tr>
                      <th className="px-6 py-3">Filename</th>
                      <th className="px-6 py-3">Date Created</th>
                      <th className="px-6 py-3">Size</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backups.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
                          No backups found.
                        </td>
                      </tr>
                    ) : (
                      backups.map((backup) => (
                        <tr key={backup.filename} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 font-mono text-xs text-slate-700">{backup.filename}</td>
                          <td className="px-6 py-4 text-slate-600">{backup.createdAt.toLocaleString()}</td>
                          <td className="px-6 py-4 text-slate-600">{formatSize(backup.size)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                              <a
                                href={`/api/backups/download/${backup.filename}`}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Download Backup"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                              <DeleteButton
                                action={removeBackup.bind(null, backup.filename)}
                                confirmMessage={`Are you sure you want to delete backup ${backup.filename}?`}
                                iconSize={4}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Cloud Provider Integration (OpenStack) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                      <label className="text-xs font-bold text-slate-500 uppercase">Auth URL (Keystone)</label>
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
          </div>

          {/* Bare Metal Provisioning (CIMC / iDRAC) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
          </div>

          {/* System Maintenance */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 space-y-6">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                System Maintenance
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Clean Failed Jobs</h3>
                  <p className="text-xs text-slate-500">Remove all build jobs that failed and delete their partial output files.</p>
                  <form action={async () => { 'use server'; await cleanupJobs('FAILED'); }}>
                    <button type="submit" className="w-full py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                      <Trash2 className="w-3 h-3" />
                      Clean Failed
                    </button>
                  </form>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Clean Old Jobs</h3>
                  <p className="text-xs text-slate-500">Remove build jobs and files older than 7 days to free up disk space.</p>
                  <form action={async () => { 'use server'; await cleanupJobs('OLD'); }}>
                    <button type="submit" className="w-full py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                      <Trash2 className="w-3 h-3" />
                      Clean Old {">"} 7d
                    </button>
                  </form>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Purge All Jobs</h3>
                  <p className="text-xs text-slate-500 text-red-600 font-medium">Danger: This will delete ALL build history and ALL custom image files.</p>
                  <form action={async () => { 'use server'; await cleanupJobs('ALL'); }}>
                    <button type="submit" className="w-full py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                      <Trash2 className="w-3 h-3" />
                      Purge All Jobs
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
