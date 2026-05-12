import { prisma } from '@/lib/prisma'
import { requireAuth, isAdmin } from '@/lib/auth-utils'
import { Trash2, Clock, CheckCircle, XCircle, HardDrive, Filter, Database } from 'lucide-react'
import Link from 'next/link'
import DeleteButton from '@/components/DeleteButton'
import { deleteJob, cleanupJobs } from '@/lib/actions/jobs'
import { SystemStats } from '@/lib/system-stats'
import fs from 'fs'
import { clsx } from 'clsx'

export const dynamic = 'force-dynamic'

export default async function BuildsManager({ 
  searchParams 
}: { 
  searchParams: Promise<{ status?: string }> 
}) {
  await requireAuth()
  const isUserAdmin = await isAdmin()
  const { status } = await searchParams
  
  const where = status ? { status } : {}
  const jobs = await prisma.buildJob.findMany({
    where,
    include: { profile: true },
    orderBy: { createdAt: 'desc' }
  })

  // Calculate file sizes
  const jobsWithSizes = jobs.map(job => {
    let size = 0
    if (job.outputPath && fs.existsSync(job.outputPath)) {
      try {
        const stats = fs.statSync(job.outputPath)
        size = stats.size
      } catch (e) {
        console.error(`Failed to get size for ${job.outputPath}:`, e)
      }
    }
    return { ...job, size }
  })

  const totalBuildsSize = jobsWithSizes.reduce((acc, job) => acc + job.size, 0)
  const failedJobsCount = jobs.filter(j => j.status === 'FAILED').length
  const oldJobsCount = jobs.filter(j => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return new Date(j.createdAt) < weekAgo
  }).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Build History</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and download generated ISO and Cloud images.</p>
        </div>
        
        {isUserAdmin && (
          <div className="flex items-center gap-2">
            <form action={async () => { 'use server'; await cleanupJobs('FAILED'); }}>
              <button 
                type="submit"
                disabled={failedJobsCount === 0}
                className="inline-flex items-center gap-2 bg-white border border-slate-300 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                Clear Failed
              </button>
            </form>
            <form action={async () => { 'use server'; await cleanupJobs('OLD'); }}>
              <button 
                type="submit"
                disabled={oldJobsCount === 0}
                className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Clock className="w-4 h-4" />
                Clear Old
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Storage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg">
            <HardDrive className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Output Space</p>
            <p className="text-2xl font-bold text-slate-900">{SystemStats.formatBytes(totalBuildsSize)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Success Builds</p>
            <p className="text-2xl font-bold text-slate-900">{jobs.filter(j => j.status === 'COMPLETED').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-lg">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Failed Jobs</p>
            <p className="text-2xl font-bold text-slate-900">{failedJobsCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <div className="flex items-center gap-2 text-slate-500 mr-2">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-bold">Filter:</span>
        </div>
        <Link 
          href="/settings/builds"
          className={clsx(
            "px-4 py-1.5 rounded-full text-xs font-bold transition-all border",
            !status ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          )}
        >
          All
        </Link>
        <Link 
          href="/settings/builds?status=COMPLETED"
          className={clsx(
            "px-4 py-1.5 rounded-full text-xs font-bold transition-all border",
            status === 'COMPLETED' ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          )}
        >
          Completed
        </Link>
        <Link 
          href="/settings/builds?status=FAILED"
          className={clsx(
            "px-4 py-1.5 rounded-full text-xs font-bold transition-all border",
            status === 'FAILED' ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          )}
        >
          Failed
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
              <th className="px-6 py-4">Profile</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Size</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobsWithSizes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                  No matching builds found.
                </td>
              </tr>
            ) : (
              jobsWithSizes.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/jobs/${job.id}`} className="font-bold text-slate-900 hover:text-indigo-600">
                      {job.profile.name}
                    </Link>
                    <p className="text-[10px] font-mono text-slate-400">{job.id.substring(0, 8)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                      job.status === 'COMPLETED' ? "bg-emerald-100 text-emerald-700" : 
                      job.status === 'FAILED' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-700">
                      {job.size > 0 ? SystemStats.formatBytes(job.size) : '---'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      {job.status === 'COMPLETED' && job.outputPath && (
                        <Link 
                          href={`/api/download/${job.id}`}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Download"
                        >
                          <Database className="w-4 h-4" />
                        </Link>
                      )}
                      {isUserAdmin && (
                        <DeleteButton 
                          action={deleteJob.bind(null, job.id, '/settings/builds')}
                          id={job.id}
                          confirmMessage="Delete this build record?"
                          iconSize={4}
                        />
                      )}
                    </div>
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
