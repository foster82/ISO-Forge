import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { Users, Globe, Shield } from 'lucide-react'
import { SystemStats } from '@/lib/system-stats'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export default async function UserUsagePage() {
  await requireAdmin()
  
  const users = await prisma.user.findMany({
    orderBy: { username: 'asc' },
    include: {
      buildJobs: {
        where: { status: 'COMPLETED' },
        select: { outputPath: true }
      },
      profiles: {
        select: { id: true }
      }
    }
  })

  const usersWithUsage = users.map(user => {
    let totalSize = 0
    user.buildJobs.forEach(job => {
      if (job.outputPath && fs.existsSync(job.outputPath)) {
        try {
          const stats = fs.statSync(job.outputPath)
          totalSize += stats.size
        } catch (e) {
          // Ignore files that might have been deleted but DB not updated
        }
      }
    })
    return {
      ...user,
      totalSize,
      profileCount: user.profiles.length,
      buildCount: user.buildJobs.length
    }
  })

  // Sort by usage descending
  usersWithUsage.sort((a, b) => b.totalSize - a.totalSize)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Management & Quotas</h1>
        <p className="text-sm text-slate-500 mt-1">Breakdown of disk space used by each user's completed builds.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Storage Consumption per User
          </h2>
        </div>
        
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Auth Source</th>
              <th className="px-6 py-4">Profiles</th>
              <th className="px-6 py-4">Builds</th>
              <th className="px-6 py-4">Disk Usage</th>
              <th className="px-6 py-4 text-right">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usersWithUsage.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                  No users found.
                </td>
              </tr>
            ) : (
              usersWithUsage.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                        {user.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{user.username}</p>
                        <p className="text-[10px] text-slate-400">{user.email || 'No email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {user.authSource === 'LDAP' ? (
                        <Globe className="w-3 h-3 text-blue-500" />
                      ) : (
                        <Shield className="w-3 h-3 text-slate-400" />
                      )}
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                        {user.authSource}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-700">{user.profileCount}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-700">{user.buildCount}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-slate-900">
                        {SystemStats.formatBytes(user.totalSize)}
                      </span>
                      {user.totalSize > 0 && (
                        <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500"
                            style={{ width: `${Math.min(100, (user.totalSize / (1024 * 1024 * 1024 * 10)) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
