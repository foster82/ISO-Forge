import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { ArrowLeft, Save, Info } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import YamlEditor from '@/components/YamlEditor'

import { updateProfile } from '@/lib/actions/profiles'
import RecipeSelector from '@/components/RecipeSelector'

export default async function EditProfile({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  await requireAuth()
  const { id } = await params
  
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { baseImage: true }
  })

  if (!profile) notFound()

  const type = profile.baseImage.imageType
  
  const baseImages = await prisma.baseImage.findMany({
    where: { imageType: type, status: 'READY' }
  })

  const recipes = await prisma.recipe.findMany({
    orderBy: { name: 'asc' }
  })

  const packagesList = JSON.parse(profile.packages) as string[]
  const packagesString = packagesList.join(', ')

  const runcmdList = JSON.parse(profile.runcmd) as string[]
  const runcmdString = runcmdList.join('\n')

  const updateProfileWithId = updateProfile.bind(null, id)

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link href={`/profiles/${id}`} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">
              Edit {profile.name}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        <RecipeSelector recipes={recipes} />
        
        <form action={updateProfileWithId} className="space-y-8">
          {/* Basic Info */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Basic Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Profile Name</label>
                <input 
                  name="name" 
                  type="text" 
                  required 
                  defaultValue={profile.name}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Profile Version</label>
                <input 
                  name="version" 
                  type="text" 
                  required 
                  defaultValue={profile.version}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Base Image</label>
                <select 
                  name="baseImageId" 
                  required
                  defaultValue={profile.baseImageId}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  {baseImages.map(img => (
                    <option key={img.id} value={img.id}>{img.name} (v{img.version})</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Identity & Auth */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Identity & Authentication</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Hostname</label>
                <input 
                  name="hostname" 
                  type="text" 
                  defaultValue={profile.hostname}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Default Username</label>
                <input 
                  name="username" 
                  type="text" 
                  defaultValue={profile.username}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="passwordMode" value="plain" defaultChecked className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-medium text-slate-700">Plaintext Password</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="passwordMode" value="hash" className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-medium text-slate-700">Pre-hashed (SHA-512)</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  Update Password (Optional)
                  <div className="group relative">
                    <Info className="w-4 h-4 text-slate-400 cursor-help" />
                    <div className="absolute bottom-full mb-2 left-0 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      Leave blank to keep the current password. If using Plaintext, we will hash it.
                    </div>
                  </div>
                </label>
                <input 
                  name="passwordInput" 
                  type="text" 
                  placeholder="Enter new password or hash to update..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium text-slate-700">SSH Public Key</label>
              <textarea 
                name="sshKey" 
                rows={3}
                defaultValue={profile.sshKey || ''}
                placeholder="ssh-rsa AAAA..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              ></textarea>
            </div>
            </section>

            {/* Regional Settings */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Regional Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Timezone</label>
                  <input 
                    name="timezone" 
                    type="text" 
                    defaultValue={profile.timezone}
                    placeholder="e.g. Europe/London"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Locale</label>
                  <input 
                    name="locale" 
                    type="text" 
                    defaultValue={profile.locale}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Networking */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Networking (Optional Static IP)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Static IP / CIDR</label>
                <input 
                  name="ipAddress" 
                  type="text" 
                  defaultValue={profile.ipAddress || ''}
                  placeholder="e.g. 192.168.1.50/24"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Gateway</label>
                <input 
                  name="gateway" 
                  type="text" 
                  defaultValue={profile.gateway || ''}
                  placeholder="e.g. 192.168.1.1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">DNS Servers</label>
                <input 
                  name="dnsServers" 
                  type="text" 
                  defaultValue={profile.dnsServers || ''}
                  placeholder="8.8.8.8, 1.1.1.1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
            </section>

            {/* Packages */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Software Packages</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Pre-installed APT Packages</label>
              <input 
                name="packages" 
                type="text" 
                defaultValue={packagesString}
                placeholder="nginx, git, docker.io, curl"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </section>

          {/* Post-Install Scripts */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Post-Install Scripts (runcmd)</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Custom Commands</label>
              <textarea 
                name="runcmd" 
                rows={4}
                defaultValue={runcmdString}
                placeholder="echo 'Hello World' > /tmp/hello.txt&#10;systemctl enable nginx"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              ></textarea>
              <p className="text-xs text-slate-500">Commands to run on first boot. Enter one command per line.</p>
            </div>
          </section>

          {/* Advanced YAML */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <h2 className="text-lg font-semibold text-slate-900">Advanced Configuration</h2>
            </div>
            <YamlEditor name="configYaml" initialValue={profile.configYaml || ''} />
          </section>

          <div className="flex items-center justify-end gap-4 pb-12">
            <Link href={`/profiles/${id}`} className="px-6 py-2 text-slate-600 font-medium hover:text-slate-900">
              Cancel
            </Link>
            <button 
              type="submit"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              Update Profile
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
