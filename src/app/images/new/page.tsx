import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { ArrowLeft, Download, Info, Upload } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DownloadEngine } from '@/lib/download-engine'
import path from 'path'
import fs from 'fs/promises'
import fsSync from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

export default async function NewImage({ 
  searchParams 
}: { 
  searchParams: Promise<{ type?: string }> 
}) {
  await requireAdmin()
  const { type = 'ISO' } = await searchParams

  async function addNewImage(formData: FormData) {
    'use server'
    await requireAdmin()
...
    const name = formData.get('name') as string
    const version = formData.get('version') as string
    const imageType = formData.get('imageType') as string
    const source = formData.get('source') as string
    
    let filename = ''
    let absolutePath = ''

    if (source === 'url') {
      const url = formData.get('url') as string
      // Extract filename from URL or default to name-version.[ext]
      const urlParts = url.split('/')
      const lastPart = urlParts[urlParts.length - 1]
      const extension = lastPart.includes('.') ? lastPart.split('.').pop() : (imageType === 'ISO' ? 'iso' : 'img')
      
      filename = (lastPart.endsWith('.iso') || lastPart.endsWith('.img') || lastPart.endsWith('.qcow2'))
        ? lastPart 
        : `${name.toLowerCase().replace(/\s+/g, '-')}-${version}.${extension}`
        
      absolutePath = path.join(process.cwd(), 'storage', 'base', filename)

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
      DownloadEngine.downloadIso(url, absolutePath).then(async (success) => {
        await prisma.baseImage.update({
          where: { id: image.id },
          data: { status: success ? 'READY' : 'FAILED' }
        })
      })
    } else {
      const file = formData.get('file') as File
      if (!file || file.size === 0) {
        // Handle error - this should be caught by client-side validation too
        return
      }

      filename = file.name
      absolutePath = path.join(process.cwd(), 'storage', 'base', filename)
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(absolutePath), { recursive: true })

      // Create DB record
      const image = await prisma.baseImage.create({
        data: {
          name,
          version,
          filename,
          path: absolutePath,
          imageType,
          status: 'DOWNLOADING', // Temporary status during write
        }
      })

      try {
        const stream = Readable.fromWeb(file.stream() as any)
        const writeStream = fsSync.createWriteStream(absolutePath)
        await pipeline(stream, writeStream)
        
        await prisma.baseImage.update({
          where: { id: image.id },
          data: { status: 'READY' }
        })
      } catch (error) {
        console.error('File upload failed:', error)
        await prisma.baseImage.update({
          where: { id: image.id },
          data: { status: 'FAILED' }
        })
      }
    }

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
        <NewImageForm type={type} addNewImage={addNewImage} />
      </main>
    </div>
  )
}

// Client Component for the form to handle the source toggle
function NewImageForm({ type, addNewImage }: { type: string, addNewImage: (formData: FormData) => Promise<void> }) {
  return (
    <form action={addNewImage} className="space-y-8">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
          <Info className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-bold">Important Note:</p>
            <p>You can either provide a direct download URL or upload a file from your computer. Larger images may take time to process.</p>
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

        <div className="space-y-4">
          <label className="text-sm font-medium text-slate-700">Image Source</label>
          <div className="flex gap-4 p-1 bg-slate-100 rounded-lg w-fit">
            <label className="flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer has-[:checked]:bg-white has-[:checked]:text-indigo-600 has-[:checked]:shadow-sm transition-all text-sm font-medium text-slate-600">
              <input type="radio" name="source" value="url" defaultChecked className="hidden" />
              <Download className="w-4 h-4" />
              Download URL
            </label>
            <label className="flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer has-[:checked]:bg-white has-[:checked]:text-indigo-600 has-[:checked]:shadow-sm transition-all text-sm font-medium text-slate-600">
              <input type="radio" name="source" value="upload" className="hidden" />
              <Upload className="w-4 h-4" />
              Local Upload
            </label>
          </div>
        </div>

        <div className="space-y-6">
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
            
            {/* Conditional inputs handled by basic CSS for simplicity without full state management if possible, 
                but actually we might need a bit of state or just keep them both and handle in server action */}
            <div className="space-y-2 [form:has(input[value=upload]:checked)_&]:hidden">
              <label className="text-sm font-medium text-slate-700">Direct Download URL</label>
              <input 
                name="url" 
                type="url" 
                placeholder="https://cdimage.debian.org/.../debian-12.5.0-amd64-netinst.iso"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-2 [form:has(input[value=url]:checked)_&]:hidden">
              <label className="text-sm font-medium text-slate-700">Select File</label>
              <input 
                name="file" 
                type="file" 
                accept=".iso,.img,.qcow2"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
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
          <div className="[form:has(input[value=upload]:checked)_&]:hidden flex items-center gap-2">
            <Download className="w-4 h-4" />
            Start Download
          </div>
          <div className="[form:has(input[value=url]:checked)_&]:hidden flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Image
          </div>
        </button>
      </div>
    </form>
  )
}
