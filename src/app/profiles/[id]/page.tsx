import { prisma } from '@/lib/prisma'
import { ArrowLeft, Play, Disc, Shield, Globe, Calendar } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BuildEngine } from '@/lib/build-engine'
import path from 'path'
import fs from 'fs/promises'
import DeleteButton from '@/components/DeleteButton'

export default async function ProfileDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { baseImage: true, buildJobs: { orderBy: { createdAt: 'desc' }, take: 5 } }
  })

  if (!profile) notFound()

  const packages = JSON.parse(profile.packages) as string[]

  async function startBuild() {
    'use server'
    
    // 1. Create a BuildJob record
    const job = await prisma.buildJob.create({
      data: {
        profileId: id,
        status: 'BUILDING',
        log: 'Job started...\n'
      }
    })

    const extension = profile!.baseImage.imageType === 'ISO' ? 'iso' : 
                     (profile!.baseImage.filename.split('.').pop() || 'img')
    
    const outputPath = path.join(process.cwd(), 'storage', 'builds', `custom-${job.id}.${extension}`)
    
    // Ensure builds directory exists
    await fs.mkdir(path.join(process.cwd(), 'storage', 'builds'), { recursive: true })

    // 2. Trigger Build in background
    BuildEngine.createCustomImage({
      baseIsoPath: profile!.baseImage.path,
      imageType: profile!.baseImage.imageType as 'ISO' | 'CLOUD_IMAGE',
      outputPath,
      hostname: profile!.hostname,
      username: profile!.username,
      passwordHash: profile!.passwordHash,
      sshKey: profile!.sshKey || undefined,
      packages,
      configYaml: profile!.configYaml || undefined,
      onLog: async (msg) => {
        const currentJob = await prisma.buildJob.findUnique({ where: { id: job.id } })
        await prisma.buildJob.update({
          where: { id: job.id },
          data: { log: (currentJob?.log || '') + msg + '\n' }
        })
      }
    }).then(async () => {
      await prisma.buildJob.update({
        where: { id: job.id },
        data: { 
          status: 'COMPLETED', 
          outputPath,
          completedAt: new Date()
        }
      })
    }).catch(async (error: unknown) => {
      const currentJob = await prisma.buildJob.findUnique({ where: { id: job.id } })
      const errorMessage = error instanceof Error ? error.message : String(error)
      await prisma.buildJob.update({
        where: { id: job.id },
        data: { 
          status: 'FAILED', 
          log: (currentJob?.log || '') + `\nFATAL ERROR: ${errorMessage}` 
        }
      })
    })

    redirect(`/jobs/${job.id}`)
  }

  async function deleteProfile() {
    'use server'
    // Also delete associated build jobs
    await prisma.buildJob.deleteMany({ where: { profileId: id } })
    await prisma.profile.delete({ where: { id } })
    redirect('/')
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{profile.name}</h1>
              <p className="text-xs text-slate-500">Profile ID: {profile.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/images" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
              Base Images
            </Link>
            <div className="flex items-center gap-3">
              <DeleteButton 
                action={deleteProfile} 
                confirmMessage="Are you sure you want to delete this profile? All associated build jobs will also be deleted."
              />
              <form action={startBuild}>
                <button 
                  type="submit"
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Build {profile.baseImage.imageType === 'ISO' ? 'ISO' : 'Cloud Image'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900">Configuration Details</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <div className="p-2 bg-indigo-50 rounded-lg h-fit">
                  <Globe className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Network Identity</p>
                  <p className="text-lg font-medium text-slate-900">{profile.hostname}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="p-2 bg-emerald-50 rounded-lg h-fit">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Primary User</p>
                  <p className="text-lg font-medium text-slate-900">{profile.username}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="p-2 bg-amber-50 rounded-lg h-fit">
                  <Disc className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Base Image</p>
                  <p className="text-slate-900">{profile.baseImage.name}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="p-2 bg-blue-50 rounded-lg h-fit">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Created On</p>
                  <p className="text-slate-900">{new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900">Pre-installed Packages</h2>
            </div>
            <div className="p-6">
              {packages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {packages.map(pkg => (
                    <span key={pkg} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200">
                      {pkg}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic text-sm">No additional packages specified.</p>
              )}
            </div>
          </div>

          {profile.sshKey && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h2 className="font-semibold text-slate-900">SSH Public Key</h2>
              </div>
              <div className="p-6">
                <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {profile.sshKey}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / Jobs List */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900">Recent Builds</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {profile.buildJobs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm italic">
                  No builds yet.
                </div>
              ) : (
                profile.buildJobs.map(job => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        job.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        job.status === 'BUILDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {job.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{job.id.substring(0, 8)}</span>
                    </div>
                    <p className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleString()}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
