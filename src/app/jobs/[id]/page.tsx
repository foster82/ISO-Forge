import { prisma } from '@/lib/prisma'
import { isAdmin, requireAuth } from '@/lib/auth-utils'
import { ArrowLeft, Clock, CheckCircle, XCircle, Terminal, Download, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import DeleteButton from '@/components/DeleteButton'
import AutoRefresh from '@/components/AutoRefresh'
import LogViewer from '@/components/LogViewer'
import { deleteJob, runBootTest } from '@/lib/actions/jobs'
import { getOpenStackProviders } from '@/lib/actions/openstack-providers'
import TestBootButton from '@/components/TestBootButton'
import OpenStackPushButton from '@/components/OpenStackPushButton'

export const dynamic = 'force-dynamic'

export default async function JobDetails({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const isUserAdmin = await isAdmin()

  const job = await prisma.buildJob.findUnique({
    where: { id },
    include: { profile: { include: { baseImage: true } } }
  })

  if (!job) notFound()

  const providers = await getOpenStackProviders()

  const isJobActive = 
    job.status === 'BUILDING' || 
    job.status === 'PENDING' || 
    job.bootTestStatus === 'RUNNING' || 
    job.bootTestStatus === 'PENDING'

  const deleteJobWithId = deleteJob.bind(null, id, `/profiles/${job.profileId}`)
  const runBootTestWithId = runBootTest.bind(null, id)

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AutoRefresh enabled={isJobActive} />
      
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link href={`/profiles/${job.profile.id}`} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Build Job #{job.id.substring(0, 8)}</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500">Profile: {job.profile.name}</p>
                {job.version && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">v{job.version}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {job.status === 'COMPLETED' && (
              <a 
                href={`/api/metadata/${job.id}/user-data`}
                target="_blank"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors flex items-center gap-1.5"
                title="Metadata Service URL for cloud-init"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Metadata URL
              </a>
            )}
            {isUserAdmin && (
              <DeleteButton 
                action={deleteJobWithId}
                confirmMessage={`Are you sure you want to delete this build job and its ${job.profile.baseImage.imageType === 'ISO' ? 'ISO' : 'Image'}?`}
              />
            )}
            {job.status === 'COMPLETED' && !job.bootTestStatus && (
              <form action={runBootTestWithId}>
                <TestBootButton />
              </form>
            )}
            {job.status === 'COMPLETED' && (
              <div className="flex items-center gap-3">
                <OpenStackPushButton jobId={job.id} providers={providers} />
                <a 
                  href={`/api/download/${job.id}`}
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download {job.profile.baseImage.imageType === 'ISO' ? 'ISO' : 'Image'}
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-full ${
                job.status === 'COMPLETED' ? 'bg-emerald-100' :
                job.status === 'FAILED' ? 'bg-red-100' :
                job.status === 'PENDING' ? 'bg-slate-100' : 'bg-amber-100 animate-pulse'
              }`}>
                {job.status === 'COMPLETED' && <CheckCircle className="w-6 h-6 text-emerald-600" />}
                {job.status === 'FAILED' && <XCircle className="w-6 h-6 text-red-600" />}
                {job.status === 'PENDING' && <Clock className="w-6 h-6 text-slate-600" />}
                {job.status === 'BUILDING' && <Clock className="w-6 h-6 text-amber-600" />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">ISO Build Status</p>
                <h2 className="text-xl font-bold text-slate-900 capitalize">{job.status.toLowerCase()}</h2>
              </div>
            </div>
          </div>

          {job.bootTestStatus && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-full ${
                  job.bootTestStatus === 'PASSED' ? 'bg-emerald-100' :
                  job.bootTestStatus === 'FAILED' ? 'bg-red-100' :
                  job.bootTestStatus === 'PENDING' ? 'bg-slate-100' : 'bg-amber-100 animate-pulse'
                }`}>
                  {job.bootTestStatus === 'PASSED' && <ShieldCheck className="w-6 h-6 text-emerald-600" />}
                  {job.bootTestStatus === 'FAILED' && <XCircle className="w-6 h-6 text-red-600" />}
                  {job.bootTestStatus === 'PENDING' && <Clock className="w-6 h-6 text-slate-600" />}
                  {job.bootTestStatus === 'RUNNING' && <Clock className="w-6 h-6 text-amber-600" />}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">QEMU Boot Test</p>
                  <h2 className="text-xl font-bold text-slate-900 capitalize">{job.bootTestStatus.toLowerCase()}</h2>
                  {job.vncPort && (
                    <p className="text-[10px] font-mono text-emerald-600 font-bold mt-0.5">
                      VNC: {5900 + job.vncPort} (Display :{job.vncPort})
                    </p>
                  )}
                </div>
              </div>
              {job.bootTestStatus === 'RUNNING' && job.vncPort && (
                <div className="flex flex-col items-end gap-1">
                   <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <p className="text-[10px] text-slate-400">Live Viewer Active</p>
                </div>
              )}
              {job.bootTestStatus === 'FAILED' && (
                <form action={runBootTestWithId}>
                  <button type="submit" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Retry Test</button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="grid grid-cols-1 gap-6">
          {job.bootTestScreenshot && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Boot Test Confirmation Screenshot
                </h3>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Captured at login/ready state
                </span>
              </div>
              <div className="p-1 bg-slate-900 aspect-video relative group">
                <img 
                  src={job.bootTestScreenshot} 
                  alt="Boot Test Screenshot" 
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <p className="text-white text-xs font-bold px-4 py-2 bg-black/60 rounded-full backdrop-blur-sm">
                    Verified Boot State
                  </p>
                </div>
              </div>
            </div>
          )}

          <LogViewer 
            jobId={id}
            logType="build"
            title={`${job.profile.baseImage.imageType === 'ISO' ? 'ISO' : 'Image'} Build Log`} 
            icon={<Terminal className="w-4 h-4 text-slate-400" />}
            content={job.log}
            isActive={job.status === 'BUILDING' || job.status === 'PENDING'}
            variant="emerald"
          />

          {(job.bootTestLog || job.bootTestStatus === 'PENDING' || job.bootTestStatus === 'RUNNING') && (
            <LogViewer 
              jobId={id}
              logType="boot"
              title="QEMU Serial Console Output" 
              icon={<Terminal className="w-4 h-4 text-slate-400" />}
              content={job.bootTestLog || ''}
              isActive={job.bootTestStatus === 'RUNNING' || job.bootTestStatus === 'PENDING'}
              variant="slate"
            />
          )}
        </div>
      </main>
    </div>
  )
}
