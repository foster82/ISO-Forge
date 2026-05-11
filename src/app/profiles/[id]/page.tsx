import { prisma } from '@/lib/prisma'
import { isAdmin, requireAuth, getCurrentUser } from '@/lib/auth-utils'
import { ArrowLeft, Play, Disc, Shield, Globe, Calendar, Edit2, Clock, Languages, Terminal, Users } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import DeleteButton from '@/components/DeleteButton'
import { startBuild, deleteProfile } from '@/lib/actions/profiles'
import { deleteJob } from '@/lib/actions/jobs'

export default async function ProfileDetails({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const { id } = await params
  const isUserAdmin = await isAdmin()
  
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { baseImage: true, buildJobs: { orderBy: { createdAt: 'desc' }, take: 5 } }
  })

  if (!profile) notFound()

  // LDAP Group Visibility Check
  if (!isUserAdmin) {
    const allowedGroups = JSON.parse(profile.allowedGroups || '[]') as string[]
    if (allowedGroups.length > 0) {
      const userGroups = user.groups || []
      const hasAccess = allowedGroups.some(group => userGroups.includes(group))
      if (!hasAccess) {
        redirect('/') // Or a custom 403 page
      }
    }
  }

  const packages = JSON.parse(profile.packages) as string[]
  const runcmd = JSON.parse(profile.runcmd || '[]') as string[]
  const allowedGroups = JSON.parse(profile.allowedGroups || '[]') as string[]

  const startBuildWithId = startBuild.bind(null, id)
  const deleteProfileWithId = deleteProfile.bind(null, id)

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
              {isUserAdmin && (
                <DeleteButton 
                  action={deleteProfileWithId} 
                  confirmMessage="Are you sure you want to delete this profile? All associated build jobs and files will also be deleted."
                />
              )}
              <Link 
                href={`/profiles/${id}/edit`}                className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors border border-slate-200"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Link>
              <form action={startBuildWithId}>
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
              <div className="flex gap-4">
                <div className="p-2 bg-slate-100 rounded-lg h-fit">
                  <Clock className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Timezone</p>
                  <p className="text-slate-900">{profile.timezone}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="p-2 bg-slate-100 rounded-lg h-fit">
                  <Languages className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Locale</p>
                  <p className="text-slate-900">{profile.locale}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="p-2 bg-indigo-50 rounded-lg h-fit">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Visibility</p>
                  <p className="text-slate-900">
                    {allowedGroups.length > 0 ? (
                      <span className="flex flex-wrap gap-1 mt-1">
                        {allowedGroups.map(g => (
                          <span key={g} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded">
                            {g}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">Public (All Users)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900">Network Configuration</h2>
            </div>
            <div className="p-6">
              {profile.ipAddress ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Static IP</p>
                    <p className="text-sm font-medium text-slate-900">{profile.ipAddress}</p>
                  </div>
                  {profile.gateway && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Gateway</p>
                      <p className="text-sm font-medium text-slate-900">{profile.gateway}</p>
                    </div>
                  )}
                  {profile.dnsServers && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">DNS Servers</p>
                      <p className="text-sm font-medium text-slate-900">{profile.dnsServers}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 italic text-sm">Configured for DHCP (Dynamic IP).</p>
              )}
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

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-400" />
                Post-Install Scripts (runcmd)
              </h2>
            </div>
            <div className="p-6">
              {runcmd.length > 0 ? (
                <div className="space-y-2">
                  {runcmd.map((cmd, idx) => (
                    <div key={idx} className="flex gap-3 font-mono text-xs bg-slate-900 text-emerald-400 p-2 rounded border border-slate-800">
                      <span className="text-slate-600 select-none">{idx + 1}</span>
                      <span className="break-all">{cmd}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic text-sm">No post-install commands configured.</p>
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
                  <div key={job.id} className="group relative">
                    <Link href={`/jobs/${job.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          job.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                          job.status === 'PENDING' ? 'bg-slate-100 text-slate-600' :
                          job.status === 'BUILDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {job.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{job.id.substring(0, 8)}</span>
                      </div>
                      <p className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleString()}</p>
                    </Link>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUserAdmin && (
                        <DeleteButton 
                          action={async (formData) => {
                            'use server'
                            const jobId = formData.get('id') as string
                            await deleteJob(jobId)
                          }}
                          id={job.id}
                          confirmMessage="Delete this build job and its output file?"
                          iconSize={3.5}
                        />
                      )}
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
