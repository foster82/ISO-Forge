import { prisma } from '@/lib/prisma'
import { ArrowLeft, Download, Info } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DownloadEngine } from '@/lib/download-engine'
import path from 'path'

export default async function NewImage({ 
  searchParams 
}: { 
  searchParams: Promise<{ type?: string }> 
}) {
  const { type = 'ISO' } = await searchParams

  async function addNewImage(formData: FormData) {
    'use server'
    
    const name = formData.get('name') as string
    const version = formData.get('version') as string
    const url = formData.get('url') as string
    const imageType = formData.get('imageType') as string
    
    // Extract filename from URL or default to name-version.[ext]
    const urlParts = url.split('/')
    const lastPart = urlParts[urlParts.length - 1]
    const extension = lastPart.includes('.') ? lastPart.split('.').pop() : (imageType === 'ISO' ? 'iso' : 'img')
    
    const filename = (lastPart.endsWith('.iso') || lastPart.endsWith('.img') || lastPart.endsWith('.qcow2'))
      ? lastPart 
      : `${name.toLowerCase().replace(/\s+/g, '-')}-${version}.${extension}`
      
    const relativePath = path.join('storage', 'base', filename)
    const absolutePath = path.join(process.cwd(), relativePath)

    // 1. Create DB record in DOWNLOADING status
    const image = await prisma.baseImage.create({
      data: {
        name,
        version,
        filename,
        path: absolutePath,
        imageType,
        status: 'DOWNLOADING',
        downloadUrl: url,
      }
    })

    // 2. Trigger background download
    // Note: We intentionally do not await this so the UI can redirect
    DownloadEngine.downloadIso(url, absolutePath).then(async (success) => {
      await prisma.baseImage.update({
        where: { id: image.id },
        data: { status: success ? 'READY' : 'FAILED' }
      })
    })

    redirect(`/images?type=${imageType}`)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link href={`/images?type=${type}`} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Add Base {type === 'ISO' ? 'ISO' : 'Cloud Image'}</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        <form action={addNewImage} className="space-y-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
              <Info className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-bold">Important Note:</p>
                <p>Ensure the URL is a <strong>direct link</strong> to a file (.iso, .img, or .qcow2). The server will download this in the background. Larger images may take several minutes to become &quot;READY&quot;.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Image Type</label>
                <select 
                  name="imageType" 
                  required
                  defaultValue={type}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="ISO">ISO (Installer)</option>
                  <option value="CLOUD_IMAGE">Cloud Image (QCOW2/IMG)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">OS Name</label>
                <input 
                  name="name" 
                  type="text" 
                  required 
                  placeholder="e.g. Debian 12 / Ubuntu 22.04"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Version</label>
                <input 
                  name="version" 
                  type="text" 
                  required 
                  placeholder="e.g. 12.5.0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Direct Download URL</label>
                <input 
                  name="url" 
                  type="url" 
                  required 
                  placeholder="https://cdimage.debian.org/.../debian-12.5.0-amd64-netinst.iso"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <Link href={`/images?type=${type}`} className="px-6 py-2 text-slate-600 font-medium hover:text-slate-900">
              Cancel
            </Link>
            <button 
              type="submit"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Start Download
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
