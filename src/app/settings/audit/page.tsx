import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { Activity, User, Calendar, Tag, Info } from 'lucide-react'
import { clsx } from 'clsx'

export const dynamic = 'force-dynamic'

export default async function AuditLogsPage({
  searchParams
}: {
  searchParams: Promise<{ action?: string, username?: string }>
}) {
  await requireAdmin()
  const { action, username } = await searchParams

  const where: any = {}
  if (action) where.action = action
  if (username) where.username = username

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: 100
  })

  const actions = await prisma.auditLog.groupBy({
    by: ['action'],
    _count: true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">Track administrative actions and resource modifications.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Tag className="w-3 h-3" />
          Filter:
        </div>
        <a 
          href="/settings/audit" 
          className={clsx(
            "px-3 py-1 rounded-full text-xs font-bold transition-all border",
            !action ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          )}
        >
          All Actions
        </a>
        {actions.map(a => (
          <a 
            key={a.action}
            href={`/settings/audit?action=${a.action}`}
            className={clsx(
              "px-3 py-1 rounded-full text-xs font-bold transition-all border",
              action === a.action ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            {a.action} ({a._count})
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Resource</th>
              <th className="px-6 py-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                        {log.username?.substring(0, 2) || 'SY'}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{log.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter",
                      log.action.includes('DELETE') ? "bg-red-100 text-red-700" :
                      log.action.includes('CREATE') ? "bg-emerald-100 text-emerald-700" :
                      log.action.includes('POWER') || log.action.includes('REBOOT') ? "bg-amber-100 text-amber-700" :
                      "bg-indigo-100 text-indigo-700"
                    )}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.resourceName ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{log.resourceName}</span>
                        {log.resourceId && <span className="text-[10px] font-mono text-slate-400">{log.resourceId.substring(0, 8)}</span>}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">System</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {log.details ? (
                      <div className="group relative">
                        <Info className="w-4 h-4 text-slate-300 cursor-help hover:text-indigo-600 transition-colors" />
                        <div className="absolute bottom-full mb-2 right-0 w-64 p-3 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 font-mono">
                          {JSON.stringify(JSON.parse(log.details), null, 2)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-300">---</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <p className="text-[10px] text-slate-400 text-center uppercase font-bold tracking-widest">
        Showing last 100 entries
      </p>
    </div>
  )
}
