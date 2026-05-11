'use client'

import { useState } from 'react'
import { Download, Upload, Info } from 'lucide-react'
import Link from 'next/link'

interface NewImageFormProps {
  type: string
  addNewImage: (formData: FormData) => Promise<{ error?: string } | void>
}

export default function NewImageForm({ type, addNewImage }: NewImageFormProps) {
  const [source, setSource] = useState<'url' | 'upload'>('url')
  const [isUploading, setIsUploading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    console.log('Form submission started...')
    setIsUploading(true)
    try {
      const result = await addNewImage(formData)

      if (result && 'error' in result) {
        console.error('Upload failed:', result.error)
        alert(`Upload failed: ${result.error}`)
        setIsUploading(false)
        return
      }

      console.log('Action completed successfully')
    } catch (error: any) {
      // Check if it's a redirect error (standard in Next.js server actions)
      if (error?.message === 'NEXT_REDIRECT' || error?.digest?.includes('NEXT_REDIRECT')) {
        console.log('Redirecting...')
        return
      }

      console.error('Upload failed with caught error:', error)
      alert(`Upload failed: ${error.message || 'Unknown error'}`)
      setIsUploading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-8" encType="multipart/form-data">
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
            <button
              type="button"
              onClick={() => setSource('url')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${
                source === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Download className="w-4 h-4" />
              Download URL
            </button>
            <button
              type="button"
              onClick={() => setSource('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${
                source === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              Local Upload
            </button>
          </div>
          {/* Hidden input to ensure 'source' value is submitted */}
          <input type="hidden" name="source" value={source} />
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
            
            {source === 'url' ? (
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
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Select File</label>
                <input 
                  name="file" 
                  type="file" 
                  required
                  accept=".iso,.img,.qcow2"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        <Link href={`/images?type=${type}`} className="px-6 py-2 text-slate-600 font-medium hover:text-slate-900">
          Cancel
        </Link>
        <button 
          type="submit"
          disabled={isUploading}
          className={`inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Processing...
            </>
          ) : source === 'url' ? (
            <>
              <Download className="w-4 h-4" />
              Start Download
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Image
            </>
          )}
        </button>
      </div>
    </form>
  )
}
