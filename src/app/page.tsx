import { prisma } from '@/lib/prisma'
import { Plus, Disc, FileText, Settings, Rocket, Clock, ChevronRight, Edit2, Server } from 'lucide-react'
import Link from 'next/link'
import DeleteButton from '@/components/DeleteButton'
import fs from 'fs'
import { revalidatePath } from 'next/cache'

interface ProfileWithBaseImage {
  id: string
  name: string
  hostname: string
  baseImage: {
    name: string
  }
}

export default async function Dashboard() {
  const buildJobs = await prisma.buildJob.findMany({
    include: { profile: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  const profiles = await prisma.profile.findMany({
    include: { baseImage: true },
    orderBy: { createdAt: 'desc' }
  })

  const isoProfiles = profiles.filter(p => p.baseImage.imageType === 'ISO')
  const cloudProfiles = profiles.filter(p => p.baseImage.imageType === 'CLOUD_IMAGE')

  const baseImageCount = await prisma.baseImage.count()

  async function deleteJob(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const job = await prisma.buildJob.findUnique({ where: { id } })
    
    if (job) {
      if (job.outputPath && fs.existsSync(job.outputPath)) {
        fs.unlinkSync(job.outputPath)
      }
      await prisma.buildJob.delete({ where: { id } })
    }
    
    revalidatePath('/')
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Rocket className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ISO Forge</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/images" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
              Base Images
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/profiles/new?type=ISO" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                New ISO Profile
              </Link>
              <Link href="/profiles/new?type=CLOUD_IMAGE" className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-900 transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                New Cloud Profile
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <p className="text-2xl font-bold text-slate-900">{buildJobs.length}</p>
              </div>
            </div>
          </div>
        </div>

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
            <h2 className="text-lg font-bold text-slate-900">Recent Build Jobs</h2>
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
                          job.status === 'BUILDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {job.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{job.id.substring(0, 8)}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate pr-8">{job.profile.name}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{new Date(job.createdAt).toLocaleString()}</p>
                    </Link>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DeleteButton 
                        action={deleteJob}
                        id={job.id}
                        confirmMessage="Delete this build job and its output file?"
                        iconSize={3.5}
                      />
                    </div>
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

function ProfileCard({ profile }: { profile: ProfileWithBaseImage }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
            <Settings className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
          </div>
          <div>
            <Link href={`/profiles/${profile.id}`} className="font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1">
              {profile.name}
            </Link>
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
