import { prisma } from '@/lib/prisma'
import { ArrowLeft, Save, Info } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { sha512 } from 'sha512-crypt-ts'
import YamlEditor from '@/components/YamlEditor'

async function updateProfile(id: string, currentPasswordHash: string, formData: FormData) {
  'use server'
  
  const name = formData.get('name') as string
  const baseImageId = formData.get('baseImageId') as string
  const hostname = formData.get('hostname') as string
  const username = formData.get('username') as string
  const sshKey = formData.get('sshKey') as string
  const packagesRaw = formData.get('packages') as string
  const configYaml = formData.get('configYaml') as string
  
  const passwordMode = formData.get('passwordMode') as string // 'plain' or 'hash'
  const passwordInput = formData.get('passwordInput') as string
  
  let passwordHash = currentPasswordHash
  
  if (passwordInput && passwordInput.length > 0) {
    if (passwordMode === 'plain') {
      passwordHash = sha512.crypt(passwordInput, Math.random().toString(36).substring(2, 10))
    } else {
      passwordHash = passwordInput
    }
  }

  const packages = packagesRaw
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0)

  await prisma.profile.update({
    where: { id },
    data: {
      name,
      baseImageId,
      hostname,
      username,
      passwordHash,
      sshKey,
      packages: JSON.stringify(packages),
      configYaml: configYaml || null
    }
  })

  redirect(`/profiles/${id}`)
}

export default async function EditProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { baseImage: true }
  })

  if (!profile) notFound()

  const baseImages = await prisma.baseImage.findMany()
  const currentPackages = JSON.parse(profile.packages) as string[]

  const updateProfileWithId = updateProfile.bind(null, id, profile.passwordHash)

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link href={`/profiles/${id}`} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Edit Profile</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        <form action={updateProfileWithId} className="space-y-8">
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
                <label className="text-sm font-medium text-slate-700">Base Image</label>
                <select 
                  name="baseImageId" 
                  required
                  defaultValue={profile.baseImageId}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  {baseImages.map(img => (
                    <option key={img.id} value={img.id}>{img.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

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
                  Update Password (optional)
                  <div className="group relative">
                    <Info className="w-4 h-4 text-slate-400 cursor-help" />
                    <div className="absolute bottom-full mb-2 left-0 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      Leave blank to keep current password. If entering a new one, we will hash it if &quot;Plaintext&quot; is selected.
                    </div>
                  </div>
                </label>
                <input 
                  name="passwordInput" 
                  type="password" 
                  placeholder="••••••••"
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

          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Software Packages</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Pre-installed APT Packages</label>
              <input 
                name="packages" 
                type="text" 
                defaultValue={currentPackages.join(', ')}
                placeholder="nginx, git, docker.io, curl"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <p className="text-xs text-slate-500">Enter package names separated by commas.</p>
            </div>
          </section>

          {/* Advanced YAML */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <h2 className="text-lg font-semibold text-slate-900">Advanced Configuration</h2>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded tracking-wider">Cloud-Init / Autoinstall</span>
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
