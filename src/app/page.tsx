import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { isAdmin, getCurrentUser } from '@/lib/auth-utils'
import { signOut } from '@/auth'
import { Plus, Disc, FileText, Settings, Rocket, Clock, ChevronRight, Edit2, Server, LogOut, HardDrive, Activity, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import DeleteButton from '@/components/DeleteButton'
import { deleteJob } from '@/lib/actions/jobs'
import { SystemStats } from '@/lib/system-stats'

export default async function Dashboard() {
  const settings = await getSettings()
  const isUserAdmin = await isAdmin()

  const buildJobs = await prisma.buildJob.findMany({
    include: { profile: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  const profiles = await prisma.profile.findMany({
    include: { baseImage: true },
    orderBy: { createdAt: 'desc' }
  })

  // Filter profiles based on LDAP groups
  const user = await getCurrentUser()
  const userGroups = user?.groups || []
  
  const filteredProfiles = profiles.filter(profile => {
    if (user?.role === 'ADMIN') return true
    
    const allowedGroups = JSON.parse(profile.allowedGroups || '[]') as string[]
    if (allowedGroups.length === 0) return true
    
    return allowedGroups.some(group => userGroups.includes(group))
  })

  const isoProfiles = filteredProfiles.filter(p => p.baseImage.imageType === 'ISO')
  const cloudProfiles = filteredProfiles.filter(p => p.baseImage.imageType === 'CLOUD_IMAGE')

  const baseImageCount = await prisma.baseImage.count()

  // Analytics Calculations
  const totalJobsCount = await prisma.buildJob.count()
  const completedJobsCount = await prisma.buildJob.count({ where: { status: 'COMPLETED' } })
  const failedJobsCount = await prisma.buildJob.count({ where: { status: 'FAILED' } })
  
  const successRate = totalJobsCount > 0 
    ? Math.round((completedJobsCount / totalJobsCount) * 100) 
    : 0

  const storageStats = await SystemStats.getStorageStats()

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            {settings.companyLogo ? (
              <div className="relative w-10 h-10">
                <Image 
                  src={settings.companyLogo} 
                  alt="Logo" 
                  fill 
                  className="object-contain" 
                  priority
                />
              </div>
            ) : (
              <Rocket className="w-8 h-8 text-indigo-600" />
            )}
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{settings.companyName}</h1>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-4">
              <Link href="/images" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                Base Images
              </Link>
              <Link href="/recipes" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                Public Recipes
              </Link>
              <Link href="/settings" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all" title="Settings">
                <Settings className="w-5 h-5" />
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/profiles/new?type=ISO" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm text-sm">
                <Plus className="w-4 h-4" />
                New ISO Profile
              </Link>
              <Link href="/profiles/new?type=CLOUD_IMAGE" className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-900 transition-colors shadow-sm text-sm">
                <Plus className="w-4 h-4" />
                New Cloud Profile
              </Link>
            </div>
            <form action={async () => { 'use server'; await signOut() }}>
              <button type="submit" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Sign Out">
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Profiles</p>
                <p className="text-2xl font-bold text-slate-900">{profiles.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <Disc className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Base Images</p>
                <p className="text-2xl font-bold text-slate-900">{baseImageCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Builds</p>
                <p className="text-2xl font-bold text-slate-900">{totalJobsCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <Activity className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Success Rate</p>
                <p className="text-2xl font-bold text-slate-900">{successRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Health Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-600" />
                Storage Health
              </h3>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                System Partition: {SystemStats.formatBytes(storageStats.totalBytes)}
              </span>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Disk Usage</span>
                  <span className={`text-xs font-bold ${storageStats.percentUsed > 80 ? 'text-red-600' : 'text-slate-900'}`}>
                    {storageStats.percentUsed}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      storageStats.percentUsed > 80 ? 'bg-red-500' : 
                      storageStats.percentUsed > 60 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${storageStats.percentUsed}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Used</p>
                    <p className="text-sm font-bold text-slate-700">{SystemStats.formatBytes(storageStats.usedBytes)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Available</p>
                    <p className="text-sm font-bold text-slate-700">{SystemStats.formatBytes(storageStats.freeBytes)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center border-l border-slate-100 pl-8">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">{settings.companyName} Data</p>
                  <p className="text-3xl font-black text-indigo-600">{SystemStats.formatBytes(storageStats.storageDirSize)}</p>
                  <p className="text-[10px] text-slate-500 mt-2">Total space consumed by base images and build outputs.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                Build Performance
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-medium text-slate-600">Successful</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{completedJobsCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-medium text-slate-600">Failed</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{failedJobsCount}</span>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">Overall Success Rate</span>
                  <span className="text-xs font-black text-indigo-600">{successRate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* ISO Profiles Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded-md">
                  <Disc className="w-4 h-4 text-indigo-700" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">ISO Customization Profiles</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isoProfiles.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 text-sm md:col-span-2">
                    No ISO profiles yet.
                  </div>
                ) : (
                  isoProfiles.map(profile => (
                    <ProfileCard key={profile.id} profile={profile} />
                  ))
                )}
              </div>
            </section>

            {/* Cloud Profiles Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-200 rounded-md">
                  <Server className="w-4 h-4 text-slate-700" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Cloud Instance Profiles</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cloudProfiles.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 text-sm md:col-span-2">
                    No cloud profiles yet.
                  </div>
                ) : (
                  cloudProfiles.map(profile => (
                    <ProfileCard key={profile.id} profile={profile} />
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Recent Build Jobs Sidebar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recent Build Jobs</h2>
              {isUserAdmin && (
                <Link href="/settings/builds" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                  Manage All
                </Link>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {buildJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No builds recorded.
                </div>
              ) : (
                buildJobs.map((job) => (
                  <div key={job.id} className="group relative">
                    <Link href={`/jobs/${job.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          job.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                          job.status === 'PENDING' ? 'bg-slate-100 text-slate-600' :
                          job.status === 'BUILDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {job.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{job.id.substring(0, 8)}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate pr-8">{job.profile.name}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{new Date(job.createdAt).toLocaleString()}</p>
                    </Link>
                    {isUserAdmin && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DeleteButton 
                          action={async (formData) => {
                            'use server'
                            const id = formData.get('id') as string
                            await deleteJob(id)
                          }}
                          id={job.id}
                          confirmMessage="Delete this build job and its output file?"
                          iconSize={3.5}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

interface ProfileWithBaseImage {
  id: string
  name: string
  version: string
  hostname: string
  baseImage: {
    name: string
  }
}

function ProfileCard({ profile }: { profile: ProfileWithBaseImage }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
            <Settings className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/profiles/${profile.id}`} className="font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1">
                {profile.name}
              </Link>
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">v{profile.version}</span>
            </div>
            <p className="text-xs text-slate-500 truncate max-w-[150px]">{profile.hostname} • {profile.baseImage.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/profiles/${profile.id}/edit`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit Profile">
            <Edit2 className="w-4 h-4" />
          </Link>
          <Link href={`/profiles/${profile.id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
