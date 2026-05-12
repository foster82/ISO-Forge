import { getSettings } from '@/lib/settings'
import { requireAdmin } from '@/lib/auth-utils'
import { Database, Download, Plus, Trash2, Wrench } from 'lucide-react'
import { updateSettings } from '@/lib/actions/settings'
import { cleanupJobs } from '@/lib/actions/jobs'
import { BackupEngine } from '@/lib/backup-engine'
import { SystemStats } from '@/lib/system-stats'
import { triggerBackup, removeBackup } from '@/lib/actions/backups'
import DeleteButton from '@/components/DeleteButton'
import { clsx } from 'clsx'

export default async function MaintenanceSettingsPage() {
  await requireAdmin()
  const settings = await getSettings()
  const backups = await BackupEngine.listBackups()
  const storageStats = await SystemStats.getStorageStats()

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Maintenance</h1>
        <p className="text-sm text-slate-500 mt-1">Manage storage, backups, and data retention policies.</p>
      </div>

      {/* Storage Overview */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Storage Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                Total size of all ISOs and builds
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Available Space</p>
              <p className="text-2xl font-bold text-slate-900">{formatSize(storageStats.freeBytes)}</p>
              <p className="mt-2 text-[10px] text-slate-500 font-medium">
                {storageStats.freeBytes < 10 * 1024 * 1024 * 1024 ? "Warning: Low space" : "Healthy capacity"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Retention Policies */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <form action={updateSettings} className="p-8 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-600" />
            Retention & Auto-Cleanup
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-bold text-slate-900">Enable Auto-Cleanup</p>
                  <p className="text-xs text-slate-500">Remove old builds once an hour.</p>
                </div>
                <input 
                  type="checkbox" 
                  name="autoCleanupEnabled" 
                  defaultChecked={settings.autoCleanupEnabled}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Job Retention (Days)</label>
                <input
                  name="jobRetentionDays"
                  type="number"
                  defaultValue={settings.jobRetentionDays}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Max Successful Builds Per Profile</label>
                <input
                  name="buildRetentionCount"
                  type="number"
                  defaultValue={settings.buildRetentionCount}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all">
              Save Policies
            </button>
          </div>
        </form>
      </section>

      {/* Database Backups */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Database Backups
            </h2>
            <form action={async () => { 'use server'; await triggerBackup(); }}>
              <button type="submit" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm">
                <Plus className="w-4 h-4" />
                New Backup
              </button>
            </form>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Filename</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((backup) => (
                  <tr key={backup.filename} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-700">{backup.filename}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{backup.createdAt.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <a href={`/api/backups/download/${backup.filename}`} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all" title="Download">
                          <Download className="w-4 h-4" />
                        </a>
                        <DeleteButton action={removeBackup.bind(null, backup.filename)} confirmMessage="Delete backup?" iconSize={4} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Manual Cleanup */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-indigo-600" />
            Manual System Cleanup
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Clean Failed Jobs</h3>
              <form action={async () => { 'use server'; await cleanupJobs('FAILED'); }}>
                <button type="submit" className="w-full py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors">
                  Purge Failed
                </button>
              </form>
            </div>
            <div className="p-4 border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Clean Old Jobs</h3>
              <form action={async () => { 'use server'; await cleanupJobs('OLD'); }}>
                <button type="submit" className="w-full py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">
                  Purge {">"} 7d
                </button>
              </form>
            </div>
            <div className="p-4 border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 text-red-600">Purge Everything</h3>
              <form action={async () => { 'use server'; await cleanupJobs('ALL'); }}>
                <button type="submit" className="w-full py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold transition-colors">
                  Full Purge
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
