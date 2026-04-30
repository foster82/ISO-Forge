import { prisma } from '@/lib/prisma'
import { isAdmin, requireAdmin } from '@/lib/auth-utils'
import { Plus, Disc, ArrowLeft, CheckCircle, Clock, XCircle, Globe, Server } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import fs from 'fs'
import DeleteButton from '@/components/DeleteButton'
import { clsx } from 'clsx'

export default async function ImagesList({ 
  searchParams 
}: { 
  searchParams: Promise<{ type?: string }> 
}) {
  const { type = 'ISO' } = await searchParams
  const isUserAdmin = await isAdmin()
  
  const images = await prisma.baseImage.findMany({
    where: { imageType: type },
    orderBy: { createdAt: 'desc' }
  })

  async function deleteImage(formData: FormData) {
    'use server'
    await requireAdmin()
    const id = formData.get('id') as string
    const image = await prisma.baseImage.findUnique({ where: { id } })
    
    if (image) {
      // 1. Delete associated profiles and their jobs
      const profiles = await prisma.profile.findMany({ where: { baseImageId: id } })
      for (const profile of profiles) {
        await prisma.buildJob.deleteMany({ where: { profileId: profile.id } })
      }
      await prisma.profile.deleteMany({ where: { baseImageId: id } })
      
      // 2. Delete the actual file if it exists
      if (fs.existsSync(image.path)) {
        fs.unlinkSync(image.path)
      }
      
      // 3. Delete the DB record
      await prisma.baseImage.delete({ where: { id } })
    }
    
    redirect(`/images?type=${type}`)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Base Image Manager</h1>
          </div>
          {isUserAdmin && (
            <Link 
              href={`/images/new?type=${type}`} 
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add {type === 'ISO' ? 'ISO' : 'Cloud Image'}
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-6">
        {/* Tabs */}
        <div className="flex items-center border-b border-slate-200">
          <Link 
            href="/images?type=ISO"
            className={clsx(
              "px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
              type === 'ISO' 
                ? "border-indigo-600 text-indigo-600 bg-white" 
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            )}
          >
            <Disc className="w-4 h-4" />
            Installer ISOs
          </Link>
          <Link 
            href="/images?type=CLOUD_IMAGE"
            className={clsx(
              "px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
              type === 'CLOUD_IMAGE' 
                ? "border-indigo-600 text-indigo-600 bg-white" 
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            )}
          >
            <Server className="w-4 h-4" />
            Cloud Base Images
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                <th className="px-6 py-4">Image Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Filename</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {images.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                    No {type === 'ISO' ? 'ISOs' : 'Cloud Images'} found.
                  </td>
                </tr>
              ) : (
                images.map((img) => (
                  <tr key={img.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          img.status === 'READY' ? 'bg-emerald-50' : 
                          img.status === 'FAILED' ? 'bg-red-50' : 'bg-amber-50'
                        }`}>
                          {img.imageType === 'ISO' ? (
                            <Disc className={`w-5 h-5 ${
                              img.status === 'READY' ? 'text-emerald-600' : 
                              img.status === 'FAILED' ? 'text-red-600' : 'text-amber-600'
                            }`} />
                          ) : (
                            <Server className={`w-5 h-5 ${
                              img.status === 'READY' ? 'text-emerald-600' : 
                              img.status === 'FAILED' ? 'text-red-600' : 'text-amber-600'
                            }`} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{img.name}</p>
                          <p className="text-xs text-slate-500">v{img.version}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {img.status === 'READY' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        {img.status === 'DOWNLOADING' && <Clock className="w-4 h-4 text-amber-500 animate-pulse" />}
                        {img.status === 'FAILED' && <XCircle className="w-4 h-4 text-red-500" />}
                        <span className={`text-xs font-semibold uppercase tracking-wider ${
                          img.status === 'READY' ? 'text-emerald-700' : 
                          img.status === 'FAILED' ? 'text-red-700' : 'text-amber-700'
                        }`}>
                          {img.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-mono text-slate-500 truncate max-w-xs">{img.filename}</p>
                      {img.downloadUrl && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-500 hover:text-indigo-700 truncate max-w-xs">
                          <Globe className="w-3 h-3" />
                          {img.downloadUrl}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isUserAdmin && (
                        <DeleteButton 
                          action={deleteImage}
                          id={img.id}
                          confirmMessage="Are you sure? Deleting this image will also delete all associated profiles and build jobs."
                          iconSize={4}
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
