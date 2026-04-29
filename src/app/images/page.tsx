import { prisma } from '@/lib/prisma'
import { Plus, Disc, ArrowLeft, CheckCircle, Clock, XCircle, Globe } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import fs from 'fs'
import DeleteButton from '@/components/DeleteButton'

export default async function ImagesList() {
  const images = await prisma.baseImage.findMany({
    orderBy: { createdAt: 'desc' }
  })

  async function deleteImage(formData: FormData) {
    'use server'
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
    
    redirect('/images')
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
          <Link href="/images/new" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Add Image
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                <th className="px-6 py-4">Image Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Filename</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {images.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                    No base images found.
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
                          <Disc className={`w-5 h-5 ${
                            img.status === 'READY' ? 'text-emerald-600' : 
                            img.status === 'FAILED' ? 'text-red-600' : 'text-amber-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{img.name}</p>
                          <p className="text-xs text-slate-500">v{img.version}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        img.imageType === 'ISO' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {img.imageType === 'ISO' ? 'ISO' : 'Cloud'}
                      </span>
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
                      <DeleteButton 
                        action={deleteImage}
                        id={img.id}
                        confirmMessage="Are you sure? Deleting this image will also delete all associated profiles and build jobs."
                        iconSize={4}
                      />
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
