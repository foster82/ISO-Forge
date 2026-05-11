'use client'

import { useState, useEffect } from 'react'
import { Download, Upload, Info, Globe } from 'lucide-react'
import Link from 'next/link'

interface SourcedImage {
  name: string
  version: string
  arch: 'amd64' | 'arm64'
  url: string
  filename: string
  imageType: 'ISO' | 'CLOUD_IMAGE'
  os: 'Ubuntu' | 'Debian' | 'Fedora' | 'Alpine' | 'Rocky' | 'Alma'
}

interface NewImageFormProps {
  type: string
  addNewImage: (formData: FormData) => Promise<{ error?: string } | void>
  getSourcedImages: (type: 'ISO' | 'CLOUD_IMAGE') => Promise<SourcedImage[]>
}

export default function NewImageForm({ type, addNewImage, getSourcedImages }: NewImageFormProps) {
  const [source, setSource] = useState<'url' | 'upload' | 'library'>('library')
  const [isUploading, setIsUploading] = useState(false)
  const [sourcedImages, setSourcedImages] = useState<SourcedImage[]>([])
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false)
  const [imageType, setImageType] = useState(type)

  const [formDataState, setFormDataState] = useState({
    name: '',
    version: '',
    url: '',
    arch: 'amd64'
  })

  useEffect(() => {
    async function loadLibrary() {
      setIsLoadingLibrary(true)
      try {
        const images = await getSourcedImages(imageType as 'ISO' | 'CLOUD_IMAGE')
        setSourcedImages(images)
      } catch (error) {
        console.error('Failed to load library:', error)
      } finally {
        setIsLoadingLibrary(false)
      }
    }

    if (source === 'library') {
      loadLibrary()
    }
  }, [source, imageType, getSourcedImages])

  const handleLibrarySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = sourcedImages.find(img => img.url === e.target.value)
    if (selected) {
      setFormDataState({
        name: selected.name,
        version: selected.version,
        url: selected.url,
        arch: selected.arch
      })
    }
  }

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
    } catch (error: unknown) {
      // Check if it's a redirect error (standard in Next.js server actions)
      const isRedirectError = error instanceof Error && 
        (error.message === 'NEXT_REDIRECT' || (error as { digest?: string }).digest?.includes('NEXT_REDIRECT'))

      if (isRedirectError) {
        console.log('Redirecting...')
        return
      }

      console.error('Upload failed with caught error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Upload failed: ${errorMessage}`)
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Image Type</label>
            <select 
              name="imageType" 
              required
              value={imageType}
              onChange={(e) => setImageType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="ISO">ISO (Installer)</option>
              <option value="CLOUD_IMAGE">Cloud Image (QCOW2/IMG)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Architecture</label>
            <select 
              name="arch" 
              required
              value={formDataState.arch}
              onChange={(e) => setFormDataState({ ...formDataState, arch: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="amd64">amd64 (x86_64)</option>
              <option value="arm64">arm64 (AArch64)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">OS Name</label>
            <input 
              name="name" 
              type="text" 
              required 
              value={formDataState.name}
              onChange={(e) => setFormDataState({ ...formDataState, name: e.target.value })}
              placeholder="e.g. Debian 12 / Ubuntu 22.04"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium text-slate-700">Image Source</label>
          <div className="flex flex-wrap gap-4 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setSource('library')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${
                source === 'library' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-4 h-4" />
              Official Library
            </button>
            <button
              type="button"
              onClick={() => setSource('url')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${
                source === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Download className="w-4 h-4" />
              Direct URL
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
          <input type="hidden" name="source" value={source === 'library' ? 'url' : source} />
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Version</label>
              <input 
                name="version" 
                type="text" 
                required 
                value={formDataState.version}
                onChange={(e) => setFormDataState({ ...formDataState, version: e.target.value })}
                placeholder="e.g. 12.5.0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            
            {source === 'library' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Select Official Release</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  onChange={handleLibrarySelect}
                  value={formDataState.url}
                  disabled={isLoadingLibrary}
                >
                  <option value="">{isLoadingLibrary ? 'Loading library...' : '-- Select an image --'}</option>
                  {sourcedImages.map(img => (
                    <option key={img.url} value={img.url}>{img.os} - {img.name}</option>
                  ))}
                </select>
                {/* Hidden input to ensure 'url' value is submitted for library source */}
                <input type="hidden" name="url" value={formDataState.url} />
              </div>
            )}

            {source === 'url' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Direct Download URL</label>
                <input 
                  name="url" 
                  type="url" 
                  required
                  value={formDataState.url}
                  onChange={(e) => setFormDataState({ ...formDataState, url: e.target.value })}
                  placeholder="https://cdimage.debian.org/.../debian-12.5.0-amd64-netinst.iso"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            )}

            {source === 'upload' && (
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
